import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import TovProfile from "@/lib/db/models/tov-profile";
import TovSource from "@/lib/db/models/tov-source";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { callClaudeJson, DEFAULT_TOV_MODEL, resolveTovModel, TOV_MODELS } from "@/lib/tov/anthropic";
import {
  ANALYZE_SYSTEM,
  buildAnalyzeContent,
  buildPreviewContent,
  buildRewriteContent,
  PREVIEW_SYSTEM,
  REWRITE_SYSTEM,
} from "@/lib/tov/prompts";
import {
  normalizeTovProfile,
  TOV_PREVIEW_SCHEMA,
  TOV_PROFILE_SCHEMA,
  TOV_REWRITE_SCHEMA,
  TOV_SCHEMA_VERSION,
} from "@/lib/tov/schema";
import {
  classifyUpload,
  extractFromUrl,
  TOV_MAX_SOURCES,
  TOV_MAX_TOTAL_BYTES,
} from "@/lib/tov/source-extract";

const MAX_HISTORY = 10;
/** An analysis stuck in "analyzing" for longer than this is considered dead (server restarted etc.). */
const STALE_ANALYSIS_MS = 12 * 60 * 1000;

/** @param {string} clientKey @param {boolean} includeTest */
async function findClient(clientKey, includeTest) {
  const key = String(clientKey ?? "").trim();
  /** @type {Record<string, unknown>[]} */
  const or = [{ slug: key }];
  if (mongoose.Types.ObjectId.isValid(key)) or.push({ _id: new mongoose.Types.ObjectId(key) });
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  return Client.findOne({ $and: [{ $or: or }, scope] }).lean();
}

/** @param {Record<string, any>} client */
async function ensureTov(client) {
  return TovProfile.findOneAndUpdate(
    { clientId: client._id },
    {
      $setOnInsert: {
        clientId: client._id,
        clientSlug: client.slug,
        status: "empty",
        isTest: client.isTest === true,
      },
    },
    { upsert: true, new: true },
  ).lean();
}

/** @param {any} bin lean() returns BSON Binary for Buffer fields */
function toBuffer(bin) {
  if (!bin) return undefined;
  if (Buffer.isBuffer(bin)) return bin;
  if (bin.buffer) return Buffer.from(bin.buffer.subarray(0, bin.position ?? bin.buffer.length));
  return Buffer.from(bin);
}

/** @param {unknown} d */
const iso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : "");

/** @param {Record<string, any>} doc */
function mapSource(doc) {
  return {
    id: String(doc._id),
    kind: doc.kind,
    mediaType: doc.mediaType,
    name: doc.name,
    url: doc.url ?? "",
    size: doc.size ?? 0,
    chars: typeof doc.text === "string" ? doc.text.length : 0,
    hasHints: Boolean(doc.hints),
    preview: typeof doc.text === "string" ? doc.text.slice(0, 220) : "",
    createdAt: iso(doc.createdAt),
    createdBy: doc.createdBy ?? "",
  };
}

/** @param {Record<string, any>} doc */
function mapTov(doc) {
  const stale =
    doc.status === "analyzing" && doc.updatedAt && Date.now() - new Date(doc.updatedAt).getTime() > STALE_ANALYSIS_MS;
  return {
    id: String(doc._id),
    status: stale ? "error" : doc.status,
    error: stale ? "Analysen blev afbrudt. Prøv igen." : (doc.error ?? ""),
    comment: doc.comment ?? "",
    model: doc.model ?? DEFAULT_TOV_MODEL,
    profile: doc.profile ? normalizeTovProfile(doc.profile) : null,
    schemaVersion: doc.schemaVersion ?? 1,
    outdatedSchema: Boolean(doc.profile) && (doc.schemaVersion ?? 1) < TOV_SCHEMA_VERSION,
    analyzedAt: iso(doc.analyzedAt),
    analyzedBy: doc.analyzedBy ?? "",
    analyzedModel: doc.analyzedModel ?? "",
    usage: doc.usage ?? null,
    preview:
      doc.preview?.html ?
        {
          html: doc.preview.html,
          title: doc.preview.title ?? "",
          model: doc.preview.model ?? "",
          generatedAt: iso(doc.preview.generatedAt),
        }
      : null,
    history: (doc.history ?? []).map((h, index) => ({
      index,
      analyzedAt: iso(h.analyzedAt),
      analyzedBy: h.analyzedBy ?? "",
      model: h.model ?? "",
      note: h.note ?? "",
    })),
  };
}

/** @param {Record<string, any>} client */
const mapClient = (client) => ({
  id: String(client.slug),
  name: String(client.name ?? ""),
  logo: String(client.logoInitials ?? "").trim() || String(client.name ?? "?").slice(0, 2).toUpperCase(),
  hue: typeof client.hue === "number" ? client.hue : 220,
});

/**
 * Full TOV workspace state for one customer.
 * @param {string} clientKey @param {boolean} includeTest
 */
export async function getTovState(clientKey, includeTest) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const [tov, sources] = await Promise.all([
    TovProfile.findOne({ clientId: client._id }).lean(),
    TovSource.find({ clientId: client._id }).select("-data").sort({ createdAt: -1 }).lean(),
  ]);
  return {
    client: mapClient(client),
    tov: tov ? mapTov(tov) : null,
    sources: sources.map(mapSource),
    models: TOV_MODELS.map(({ id, label }) => ({ id, label })),
    limits: { maxSources: TOV_MAX_SOURCES },
  };
}

/**
 * Overview: every customer with TOV status (for the /tov section).
 * @param {boolean} includeTest
 */
export async function listTovOverview(includeTest) {
  await connectDb();
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const clients = await Client.find(scope).select("slug name logoInitials hue status isTest").sort({ name: 1 }).limit(1000).lean();
  const ids = clients.map((c) => c._id);
  const [tovs, counts] = await Promise.all([
    TovProfile.find({ clientId: { $in: ids } })
      .select("clientId status analyzedAt analyzedModel profile.confidence.overall profile.voice.summary preview.generatedAt")
      .lean(),
    TovSource.aggregate([{ $match: { clientId: { $in: ids } } }, { $group: { _id: "$clientId", n: { $sum: 1 } } }]),
  ]);
  const tovBy = new Map(tovs.map((t) => [String(t.clientId), t]));
  const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    rows: clients.map((c) => {
      const t = tovBy.get(String(c._id));
      return {
        client: { ...mapClient(c), status: c.status ?? "active" },
        status: t?.status ?? "empty",
        sourceCount: countBy.get(String(c._id)) ?? 0,
        analyzedAt: iso(t?.analyzedAt),
        model: t?.analyzedModel ?? "",
        confidence: t?.profile?.confidence?.overall ?? null,
        summary: t?.profile?.voice?.summary ?? "",
        hasPreview: Boolean(t?.preview?.generatedAt),
      };
    }),
  };
}

/* ----------------------------------------------------------------- sources */

/** @param {string} clientId */
async function totals(clientId) {
  const rows = await TovSource.aggregate([
    { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
    { $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: "$size" } } },
  ]);
  return { n: rows[0]?.n ?? 0, bytes: rows[0]?.bytes ?? 0 };
}

/**
 * @param {string} clientKey @param {boolean} includeTest
 * @param {Array<{ name: string; type: string; size: number; buffer: Buffer }>} files
 * @param {{ by?: string }} meta
 */
export async function addFileSources(clientKey, includeTest, files, meta = {}) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  await ensureTov(client);
  const used = await totals(String(client._id));
  let n = used.n;
  let bytes = used.bytes;
  /** @type {string[]} */
  const errors = [];
  let added = 0;
  for (const file of files) {
    if (n >= TOV_MAX_SOURCES) {
      errors.push(`Maks ${TOV_MAX_SOURCES} kilder pr. kunde`);
      break;
    }
    const parsed = classifyUpload(file);
    if ("error" in parsed) {
      errors.push(parsed.error);
      continue;
    }
    if (bytes + file.size > TOV_MAX_TOTAL_BYTES) {
      errors.push(`${file.name}: samlet materiale må max være ${Math.round(TOV_MAX_TOTAL_BYTES / 1048576)} MB`);
      continue;
    }
    await TovSource.create({
      clientId: client._id,
      kind: "file",
      mediaType: parsed.value.mediaType,
      name: file.name,
      mimeType: parsed.value.mimeType,
      size: file.size,
      text: parsed.value.text ?? "",
      data: parsed.value.data,
      createdBy: meta.by,
      isTest: client.isTest === true,
    });
    n += 1;
    bytes += file.size;
    added += 1;
  }
  return { added, errors };
}

/**
 * @param {string} clientKey @param {boolean} includeTest @param {string} rawUrl @param {{ by?: string }} meta
 */
export async function addUrlSource(clientKey, includeTest, rawUrl, meta = {}) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  await ensureTov(client);
  const used = await totals(String(client._id));
  if (used.n >= TOV_MAX_SOURCES) return { error: `Maks ${TOV_MAX_SOURCES} kilder pr. kunde`, status: 400 };
  const url = String(rawUrl ?? "").trim();
  if (!url) return { error: "Angiv en URL", status: 400 };
  try {
    const page = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    await TovSource.create({
      clientId: client._id,
      kind: "url",
      mediaType: "html",
      name: page.title,
      url: page.url,
      mimeType: "text/html",
      size: Buffer.byteLength(page.text),
      text: page.text,
      hints: page.hints,
      createdBy: meta.by,
      isTest: client.isTest === true,
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kunne ikke hente siden", status: 400 };
  }
}

/**
 * Pasted text (e.g. e-mail copy).
 * @param {string} clientKey @param {boolean} includeTest @param {{ name?: string; text?: string }} input @param {{ by?: string }} meta
 */
export async function addTextSource(clientKey, includeTest, input, meta = {}) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const text = String(input.text ?? "").trim();
  if (text.length < 20) return { error: "Teksten er for kort", status: 400 };
  await ensureTov(client);
  const used = await totals(String(client._id));
  if (used.n >= TOV_MAX_SOURCES) return { error: `Maks ${TOV_MAX_SOURCES} kilder pr. kunde`, status: 400 };
  await TovSource.create({
    clientId: client._id,
    kind: "text",
    mediaType: "text",
    name: String(input.name ?? "").trim() || "Indsat tekst",
    mimeType: "text/plain",
    size: Buffer.byteLength(text),
    text: text.slice(0, 60_000),
    createdBy: meta.by,
    isTest: client.isTest === true,
  });
  return { ok: true };
}

/** @param {string} clientKey @param {boolean} includeTest @param {string} sourceId */
export async function deleteSource(clientKey, includeTest, sourceId) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  if (!mongoose.Types.ObjectId.isValid(sourceId)) return { error: "Ugyldigt id", status: 400 };
  await TovSource.deleteOne({ _id: sourceId, clientId: client._id });
  return { ok: true };
}

/* ---------------------------------------------------------------- settings */

/**
 * @param {string} clientKey @param {boolean} includeTest @param {{ comment?: unknown; model?: unknown }} patch
 */
export async function updateTovSettings(clientKey, includeTest, patch) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  await ensureTov(client);
  /** @type {Record<string, unknown>} */
  const $set = {};
  if (typeof patch.comment === "string") $set.comment = patch.comment.slice(0, 8000);
  if (patch.model !== undefined) $set.model = resolveTovModel(patch.model).id;
  if (Object.keys($set).length) await TovProfile.updateOne({ clientId: client._id }, { $set });
  return { ok: true };
}

/* ---------------------------------------------------------------- analysis */

/**
 * Mark analysis as started (atomic) and return what the background job needs.
 * @param {string} clientKey @param {boolean} includeTest @param {{ model?: unknown; comment?: unknown; by?: string }} input
 */
export async function beginAnalysis(clientKey, includeTest, input) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  await ensureTov(client);
  const sourceCount = await TovSource.countDocuments({ clientId: client._id });
  if (sourceCount === 0 && !(typeof input.comment === "string" && input.comment.trim())) {
    return { error: "Tilføj mindst én kilde (fil, link eller tekst) før analysen", status: 400 };
  }
  const model = resolveTovModel(input.model).id;
  const freshAfter = new Date(Date.now() - STALE_ANALYSIS_MS);
  const started = await TovProfile.findOneAndUpdate(
    {
      clientId: client._id,
      $or: [{ status: { $ne: "analyzing" } }, { updatedAt: { $lt: freshAfter } }],
    },
    {
      $set: {
        status: "analyzing",
        error: "",
        model,
        ...(typeof input.comment === "string" ? { comment: input.comment.slice(0, 8000) } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!started) return { error: "Der kører allerede en analyse for denne kunde", status: 409 };
  return { clientId: String(client._id), clientName: String(client.name ?? ""), model, by: input.by };
}

/**
 * Background job: run the model and persist the profile. Never throws.
 * @param {{ clientId: string; clientName: string; model: string; by?: string }} job
 */
export async function runAnalysis(job) {
  try {
    await connectDb();
    const [tov, sources] = await Promise.all([
      TovProfile.findOne({ clientId: job.clientId }).lean(),
      TovSource.find({ clientId: job.clientId }).sort({ createdAt: 1 }).lean(),
    ]);
    const content = buildAnalyzeContent({
      clientName: job.clientName,
      comment: tov?.comment ?? "",
      sources: sources.map((s) => ({ ...s, data: toBuffer(s.data) })),
      previousProfile: tov?.profile ?? undefined,
    });
    const result = await callClaudeJson({
      model: job.model,
      system: ANALYZE_SYSTEM,
      content,
      schema: TOV_PROFILE_SCHEMA,
      maxTokens: 16000,
    });
    const profile = normalizeTovProfile(result.json);
    /** @type {Record<string, unknown>} */
    const push = {};
    if (tov?.profile) {
      push.history = {
        $each: [
          {
            profile: tov.profile,
            analyzedAt: tov.analyzedAt,
            analyzedBy: tov.analyzedBy,
            model: tov.analyzedModel,
            note: "Før ny analyse",
          },
        ],
        $position: 0,
        $slice: MAX_HISTORY,
      };
    }
    await TovProfile.updateOne(
      { clientId: job.clientId },
      {
        $set: {
          status: "ready",
          error: "",
          profile,
          schemaVersion: TOV_SCHEMA_VERSION,
          analyzedAt: new Date(),
          analyzedBy: job.by,
          analyzedModel: result.model,
          usage: result.usage,
        },
        ...(push.history ? { $push: push } : {}),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysen fejlede";
    await TovProfile.updateOne(
      { clientId: job.clientId },
      { $set: { status: "error", error: message.slice(0, 600) } },
    ).catch(() => {});
  }
}

/* ----------------------------------------------------------------- preview */

/**
 * (Re)generate and store the HTML preview.
 * @param {string} clientKey @param {boolean} includeTest @param {{ model?: unknown }} input
 */
export async function generatePreview(clientKey, includeTest, input) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const tov = await TovProfile.findOne({ clientId: client._id }).lean();
  if (!tov?.profile) return { error: "Kør analysen først", status: 400 };
  const model = resolveTovModel(input.model ?? tov.model).id;
  try {
    const result = await callClaudeJson({
      model,
      system: PREVIEW_SYSTEM,
      content: buildPreviewContent(normalizeTovProfile(tov.profile), String(client.name ?? "")),
      schema: TOV_PREVIEW_SCHEMA,
      maxTokens: 16000,
    });
    const html = String(result.json?.html ?? "");
    if (!/<html|<body/i.test(html)) return { error: "Modellen returnerede ikke gyldig HTML", status: 502 };
    const preview = {
      html,
      title: String(result.json?.title ?? ""),
      model: result.model,
      generatedAt: new Date(),
    };
    await TovProfile.updateOne({ clientId: client._id }, { $set: { preview } });
    return { preview: { ...preview, generatedAt: preview.generatedAt.toISOString() } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kunne ikke generere preview", status: 502 };
  }
}

/**
 * Playground: rewrite text in the customer's tone (not stored).
 * @param {string} clientKey @param {boolean} includeTest @param {{ text?: string; model?: unknown }} input
 */
export async function rewriteInTone(clientKey, includeTest, input) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const tov = await TovProfile.findOne({ clientId: client._id }).lean();
  if (!tov?.profile) return { error: "Kør analysen først", status: 400 };
  const text = String(input.text ?? "").trim();
  if (!text) return { error: "Skriv en tekst først", status: 400 };
  try {
    const result = await callClaudeJson({
      model: resolveTovModel(input.model ?? tov.model).id,
      system: REWRITE_SYSTEM,
      content: buildRewriteContent(normalizeTovProfile(tov.profile), String(client.name ?? ""), text.slice(0, 8000)),
      schema: TOV_REWRITE_SCHEMA,
      maxTokens: 4000,
    });
    return {
      rewritten: String(result.json?.rewritten ?? ""),
      changes: Array.isArray(result.json?.changes) ? result.json.changes.map(String) : [],
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kunne ikke omskrive", status: 502 };
  }
}

/* ------------------------------------------------------- manual edit / undo */

/**
 * Save a hand-edited profile (normalised). Previous version goes to history.
 * @param {string} clientKey @param {boolean} includeTest @param {unknown} rawProfile @param {{ by?: string }} meta
 */
export async function saveProfileEdit(clientKey, includeTest, rawProfile, meta = {}) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  if (!rawProfile || typeof rawProfile !== "object") return { error: "Ugyldig profil", status: 400 };
  const tov = await TovProfile.findOne({ clientId: client._id }).lean();
  if (!tov) return { error: "Ingen profil at redigere", status: 400 };
  const profile = normalizeTovProfile(rawProfile);
  await TovProfile.updateOne(
    { clientId: client._id },
    {
      $set: { profile, schemaVersion: TOV_SCHEMA_VERSION, status: "ready", error: "" },
      ...(tov.profile ?
        {
          $push: {
            history: {
              $each: [
                {
                  profile: tov.profile,
                  analyzedAt: tov.analyzedAt,
                  analyzedBy: tov.analyzedBy,
                  model: tov.analyzedModel,
                  note: `Manuel redigering af ${meta.by ?? "bruger"}`,
                },
              ],
              $position: 0,
              $slice: MAX_HISTORY,
            },
          },
        }
      : {}),
    },
  );
  return { ok: true };
}

/** @param {string} clientKey @param {boolean} includeTest @param {number} index */
export async function restoreHistory(clientKey, includeTest, index) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const tov = await TovProfile.findOne({ clientId: client._id }).lean();
  const entry = tov?.history?.[index];
  if (!tov || !entry?.profile) return { error: "Version findes ikke", status: 404 };
  return saveProfileEdit(clientKey, includeTest, entry.profile, { by: "gendannelse" });
}
