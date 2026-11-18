import mongoose from "mongoose";

import Client from "@/lib/db/models/client";
import ClientDomain from "@/lib/db/models/client-domain";
import Contact from "@/lib/db/models/contact";
import TeamMember from "@/lib/db/models/team-member";
import TovProfile from "@/lib/db/models/tov-profile";
import TovSource from "@/lib/db/models/tov-source";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import { callClaudeJson, DEFAULT_TOV_MODEL, resolveTovModel, TOV_MODELS } from "@/lib/tov/anthropic";
import { tovHostKey, validateTovBriefing } from "@/lib/tov/briefing";
import { renderBrandCoreDocument } from "@/lib/tov/preview-html";
import {
  ANALYZE_SYSTEM,
  buildAnalyzeContent,
  buildPreviewContent,
  buildRewriteContent,
  PREVIEW_SYSTEM,
  REWRITE_SYSTEM,
} from "@/lib/tov/prompts";
import {
  normalizeTovPreviewCopy,
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

/** Stored model choice, or the default when the user never picked one. @param {Record<string, any> | null | undefined} doc */
const storedModel = (doc) => (doc?.modelChosenAt ? resolveTovModel(doc.model).id : DEFAULT_TOV_MODEL);

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/**
 * Client domains, primary first. Without ClientDomain rows the ClickUp task name is used when it
 * looks like a domain (it usually is the primary domain).
 * @param {Record<string, any>} client
 */
async function listClientDomains(client) {
  const rows = await ClientDomain.find({ clientId: client._id })
    .select("domain isPrimary")
    .sort({ isPrimary: -1, domain: 1 })
    .lean();
  const list = rows
    .filter((r) => String(r.domain ?? "").trim())
    .map((r) => ({ domain: String(r.domain).trim(), isPrimary: r.isPrimary === true }));
  if (list.length) return list;
  const fromTask = tovHostKey(client.clickUpTaskName);
  return DOMAIN_RE.test(fromTask) ? [{ domain: fromTask, isPrimary: true }] : [];
}

/** Active team members for the "Kundeansvarlig" select. @param {boolean} includeTest */
async function listTeamOptions(includeTest) {
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const rows = await TeamMember.find({ $and: [scope, { active: { $ne: false } }] })
    .select("key name roleTitle")
    .sort({ name: 1 })
    .limit(500)
    .lean();
  return rows.map((m) => ({ key: String(m.key), name: String(m.name ?? m.key), role: String(m.roleTitle ?? "") }));
}

/**
 * Saved briefing, pre-filled from the client's primary contact and account owner when empty.
 * @param {Record<string, any>} client @param {Record<string, any> | null | undefined} tov
 */
async function briefingWithDefaults(client, tov) {
  const needsContact = !tov?.contactName || !tov?.contactTitle;
  const contact =
    needsContact ?
      await Contact.findOne({ clientId: client._id }).select("name title").sort({ isPrimary: -1, updatedAt: -1 }).lean()
    : null;
  return {
    contactName: String(tov?.contactName || contact?.name || ""),
    contactTitle: String(tov?.contactTitle || contact?.title || ""),
    accountOwnerKey: String(tov?.accountOwnerKey || client.ownerMemberKey || ""),
  };
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
    analysisStartedAt: doc.status === "analyzing" ? iso(doc.analysisStartedAt ?? doc.updatedAt) : null,
    comment: doc.comment ?? "",
    model: storedModel(doc),
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
  const tovPromise = TovProfile.findOne({ clientId: client._id }).lean();
  const [tov, sources, domains, team, briefing] = await Promise.all([
    tovPromise,
    TovSource.find({ clientId: client._id }).select("-data").sort({ createdAt: -1 }).lean(),
    listClientDomains(client),
    listTeamOptions(includeTest),
    tovPromise.then((t) => briefingWithDefaults(client, t)),
  ]);
  return {
    client: mapClient(client),
    tov: tov ? mapTov(tov) : null,
    sources: sources.map(mapSource),
    domains,
    team,
    briefing,
    models: TOV_MODELS.map(({ id, label }) => ({ id, label })),
    defaultModel: DEFAULT_TOV_MODEL,
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
  return storeUrlSource({ clientId: String(client._id), isTest: client.isTest === true }, rawUrl, meta.by);
}

/**
 * Fetch a public page and store it as a URL source.
 * @param {{ clientId: string; isTest: boolean }} target @param {unknown} rawUrl @param {string} [by]
 * @returns {Promise<{ ok: true } | { error: string; status: number }>}
 */
async function storeUrlSource(target, rawUrl, by) {
  const used = await totals(target.clientId);
  if (used.n >= TOV_MAX_SOURCES) return { error: `Maks ${TOV_MAX_SOURCES} kilder pr. kunde`, status: 400 };
  const url = String(rawUrl ?? "").trim();
  if (!url) return { error: "Angiv en URL", status: 400 };
  try {
    const page = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    await TovSource.create({
      clientId: target.clientId,
      kind: "url",
      mediaType: "html",
      name: page.title,
      url: page.url,
      mimeType: "text/html",
      size: Buffer.byteLength(page.text),
      text: page.text,
      hints: page.hints,
      createdBy: by,
      isTest: target.isTest,
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
  const name = String(input.name ?? "").trim() || "Indsat tekst";
  if (text.length < 20) return { error: "Teksten er for kort (mindst 20 tegn)", status: 400 };
  await ensureTov(client);
  const used = await totals(String(client._id));
  if (used.n >= TOV_MAX_SOURCES) return { error: `Maks ${TOV_MAX_SOURCES} kilder pr. kunde`, status: 400 };
  await TovSource.create({
    clientId: client._id,
    kind: "text",
    mediaType: "text",
    name: name.slice(0, 200),
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
 * "" (no account owner) or an existing team member key.
 * @param {unknown} raw @param {boolean} includeTest
 * @returns {Promise<{ key: string } | { error: string; status: number }>}
 */
async function resolveAccountOwner(raw, includeTest) {
  const key = String(raw ?? "").trim();
  if (!key) return { key: "" };
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  const exists = await TeamMember.exists({ $and: [scope, { key }] });
  return exists ? { key } : { error: "Ukendt kundeansvarlig", status: 400 };
}

/**
 * @param {string} clientKey @param {boolean} includeTest
 * @param {{ comment?: unknown; model?: unknown; contactName?: unknown; contactTitle?: unknown; accountOwnerKey?: unknown }} patch
 */
export async function updateTovSettings(clientKey, includeTest, patch) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  await ensureTov(client);
  /** @type {Record<string, unknown>} */
  const $set = {};
  if (typeof patch.comment === "string") $set.comment = patch.comment.slice(0, 8000);
  if (typeof patch.contactName === "string") $set.contactName = patch.contactName.trim().slice(0, 120);
  if (typeof patch.contactTitle === "string") $set.contactTitle = patch.contactTitle.trim().slice(0, 120);
  if (patch.accountOwnerKey !== undefined) {
    const owner = await resolveAccountOwner(patch.accountOwnerKey, includeTest);
    if ("error" in owner) return owner;
    $set.accountOwnerKey = owner.key;
  }
  if (patch.model !== undefined) {
    $set.model = resolveTovModel(patch.model).id;
    $set.modelChosenAt = new Date();
  }
  if (Object.keys($set).length) await TovProfile.updateOne({ clientId: client._id }, { $set });
  return { ok: true };
}

/* ---------------------------------------------------------------- analysis */

/**
 * Mark analysis as started (atomic) and return what the background job needs.
 * Missing briefing fields fall back to what is saved (or pre-filled) for the client. All briefing
 * fields except the account owner are required.
 * `domains`: client domains to fetch as URL sources. When omitted and there is no URL source yet,
 * the client's primary domain is used.
 * @param {string} clientKey @param {boolean} includeTest
 * @param {{ model?: unknown; comment?: unknown; contactName?: unknown; contactTitle?: unknown; accountOwnerKey?: unknown; domains?: unknown; by?: string }} input
 */
export async function beginAnalysis(clientKey, includeTest, input) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const tov = await ensureTov(client);
  const [defaults, clientDomains, urlSources] = await Promise.all([
    briefingWithDefaults(client, tov),
    listClientDomains(client),
    TovSource.find({ clientId: client._id, kind: "url" }).select("url").lean(),
  ]);
  const brief = {
    contactName: String(input.contactName ?? defaults.contactName).trim().slice(0, 120),
    contactTitle: String(input.contactTitle ?? defaults.contactTitle).trim().slice(0, 120),
    comment: String(input.comment ?? tov?.comment ?? "").slice(0, 8000),
    model: input.model !== undefined ? resolveTovModel(input.model).id : storedModel(tov),
  };
  const fields = validateTovBriefing(brief);
  if (Object.keys(fields).length) return { error: Object.values(fields).join(" "), fields, status: 400 };
  const owner = await resolveAccountOwner(input.accountOwnerKey ?? defaults.accountOwnerKey, includeTest);
  if ("error" in owner) return { ...owner, fields: { accountOwnerKey: owner.error } };

  const haveHosts = new Set(urlSources.map((s) => tovHostKey(s.url)));
  const byHost = new Map(clientDomains.map((d) => [tovHostKey(d.domain), d.domain]));
  const wanted =
    Array.isArray(input.domains) ? input.domains.map(tovHostKey).filter((h) => byHost.has(h))
    : haveHosts.size === 0 && clientDomains[0] ? [tovHostKey(clientDomains[0].domain)]
    : [];
  const domains = [...new Set(wanted)].filter((h) => !haveHosts.has(h)).map((h) => /** @type {string} */ (byHost.get(h)));

  const model = brief.model;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
        analysisStartedAt: new Date(),
        analysisRunId: runId,
        model,
        comment: brief.comment,
        contactName: brief.contactName,
        contactTitle: brief.contactTitle,
        accountOwnerKey: owner.key,
        ...(input.model !== undefined ? { modelChosenAt: new Date() } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!started) return { error: "Der kører allerede en analyse for denne kunde", status: 409 };
  return {
    clientId: String(client._id),
    clientName: String(client.name ?? ""),
    isTest: client.isTest === true,
    model,
    domains,
    by: input.by,
    runId,
  };
}

/**
 * Background job: fetch selected client domains, run the model and persist the profile. Never throws.
 * @param {{ clientId: string; clientName: string; isTest?: boolean; model: string; domains?: string[]; by?: string; runId: string }} job
 */
export async function runAnalysis(job) {
  try {
    await connectDb();
    /** @type {string[]} */
    const domainErrors = [];
    for (const domain of job.domains ?? []) {
      const added = await storeUrlSource({ clientId: job.clientId, isTest: job.isTest === true }, domain, job.by);
      if ("error" in added) domainErrors.push(`${domain}: ${added.error}`);
    }
    const [tov, sources] = await Promise.all([
      TovProfile.findOne({ clientId: job.clientId }).lean(),
      TovSource.find({ clientId: job.clientId }).sort({ createdAt: 1 }).lean(),
    ]);
    if (sources.length === 0 && domainErrors.length) {
      throw new Error(`Kunne ikke hente kundens domæne (${domainErrors.join(" · ")}). Tilføj materiale manuelt.`);
    }
    const content = buildAnalyzeContent({
      clientName: job.clientName,
      comment: tov?.comment ?? "",
      sources: sources.map((s) => ({ ...s, data: toBuffer(s.data) })),
      previousProfile: tov?.profile ?? undefined,
      contact: { name: tov?.contactName ?? "", title: tov?.contactTitle ?? "" },
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
    // Kun gem hvis kørslen ikke er afbrudt/erstattet imens
    await TovProfile.updateOne(
      { clientId: job.clientId, status: "analyzing", analysisRunId: job.runId },
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
      { clientId: job.clientId, status: "analyzing", analysisRunId: job.runId },
      { $set: { status: "error", error: message.slice(0, 600) } },
    ).catch(() => {});
  }
}

/**
 * Afbryd en kørende analyse. Modelkaldet kan ikke stoppes midtvejs, men resultatet kasseres.
 * @param {string} clientKey @param {boolean} includeTest
 */
export async function cancelAnalysis(clientKey, includeTest) {
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const tov = await TovProfile.findOne({ clientId: client._id, status: "analyzing" }).lean();
  if (!tov) return { cancelled: false };
  await TovProfile.updateOne(
    { clientId: client._id, status: "analyzing" },
    { $set: { status: tov.profile ? "ready" : "empty", error: "" }, $unset: { analysisRunId: 1, analysisStartedAt: 1 } },
  );
  return { cancelled: true };
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
  const model = input.model !== undefined ? resolveTovModel(input.model).id : storedModel(tov);
  const profile = normalizeTovProfile(tov.profile);
  const brandName = String(client.name ?? "");
  try {
    const [result, domains] = await Promise.all([
      callClaudeJson({
        model,
        system: PREVIEW_SYSTEM,
        content: buildPreviewContent(profile, brandName),
        schema: TOV_PREVIEW_SCHEMA,
        maxTokens: 16000,
      }),
      listClientDomains(client),
    ]);
    const copy = normalizeTovPreviewCopy(result.json);
    const generatedAt = new Date();
    const preview = {
      html: renderBrandCoreDocument({ profile, copy, brandName, domain: domains[0]?.domain ?? "", generatedAt }),
      title: copy.title || `${brandName} Brand Core`,
      model: result.model,
      generatedAt,
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
      model: input.model !== undefined ? resolveTovModel(input.model).id : storedModel(tov),
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
