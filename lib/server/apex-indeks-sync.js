import Client from "@/lib/db/models/client";
import { connectDb } from "@/lib/db/mongoose";
import { env } from "@/lib/env";

const FETCH_TIMEOUT_MS = 45_000;

/** @param {unknown} v */
function toDate(v) {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** @param {unknown} v */
function toNumberOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function isApexIndeksConfigured() {
  return Boolean(env.APEX_BASE_URL?.trim() && env.CRM_INDEKS_API_KEY?.trim());
}

/**
 * Hent alle Indeks-rækker fra Apex (ét kald, ingen live platformkald) og gem dem på
 * kunderne. Matcher KUN på ClickUp-id (Client.customerClickUpId).
 *
 * @returns {Promise<{ ok: true; fetched: number; matched: number; updated: number; unmatched: number; unmatchedSample: string[]; statusCounts: Record<string, number>; generatedAt?: string } | { ok: false; error: string; status?: number }>}
 */
export async function syncApexIndeks() {
  if (!isApexIndeksConfigured()) {
    return { ok: false, error: "APEX_BASE_URL og CRM_INDEKS_API_KEY er ikke sat", status: 503 };
  }

  const url = `${String(env.APEX_BASE_URL).trim().replace(/\/+$/, "")}/api/crm/indeks`;
  /** @type {Record<string, unknown>} */
  let body;
  try {
    const res = await fetch(url, {
      headers: { "x-api-key": String(env.CRM_INDEKS_API_KEY).trim() },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 401) return { ok: false, error: "Apex afviste nøglen (401)", status: 502 };
    if (res.status === 503) return { ok: false, error: "Nøglen er ikke konfigureret i Apex (503)", status: 502 };
    if (!res.ok) return { ok: false, error: `Apex svarede ${res.status}`, status: 502 };
    body = /** @type {Record<string, unknown>} */ (await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kunne ikke hente fra Apex";
    return { ok: false, error: msg, status: 502 };
  }

  const rows = Array.isArray(body.customers) ? body.customers : [];
  const now = new Date();
  /** @type {Record<string, number>} */
  const statusCounts = {};

  await connectDb();

  /** @type {Map<string, Record<string, unknown>>} */
  const byClickUpId = new Map();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (r);
    const id = typeof row.customerClickupId === "string" ? row.customerClickupId.trim() : "";
    if (!id) continue;
    byClickUpId.set(id, row);
    const s = typeof row.status === "string" ? row.status : "unknown";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  const ids = [...byClickUpId.keys()];
  const clients = ids.length ?
      await Client.find({ customerClickUpId: { $in: ids } }).select("customerClickUpId").lean()
    : [];
  const matchedIds = new Set(clients.map((c) => String(c.customerClickUpId)));

  const ops = [];
  for (const c of clients) {
    const row = byClickUpId.get(String(c.customerClickUpId));
    if (!row) continue;
    const status = typeof row.status === "string" ? row.status : "pending";
    ops.push({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            apexIndeks: {
              // Aldrig 100 som fallback: kun et tal når status er "ok".
              indeks: status === "ok" ? toNumberOrNull(row.indeks) : null,
              status,
              businessCategory: typeof row.businessCategory === "string" ? row.businessCategory : undefined,
              headlineMetric: typeof row.headlineMetric === "string" ? row.headlineMetric : undefined,
              aggregation: typeof row.aggregation === "string" ? row.aggregation : undefined,
              partial: row.partial === true,
              customerCount: typeof row.customerCount === "number" ? row.customerCount : undefined,
              computedAt: toDate(row.computedAt),
              fetchedAt: now,
              window: row.window ?? undefined,
              perChannel: Array.isArray(row.perChannel) ? row.perChannel : undefined,
              members: Array.isArray(row.members) ? row.members : undefined,
            },
          },
        },
      },
    });
  }
  const result = ops.length ? await Client.bulkWrite(ops, { ordered: false }) : null;

  const unmatched = ids.filter((id) => !matchedIds.has(id));
  return {
    ok: true,
    fetched: byClickUpId.size,
    matched: matchedIds.size,
    updated: result?.modifiedCount ?? 0,
    unmatched: unmatched.length,
    unmatchedSample: unmatched.slice(0, 10).map((id) => String(byClickUpId.get(id)?.customerName ?? id)),
    statusCounts,
    generatedAt: typeof body.generatedAt === "string" ? body.generatedAt : undefined,
  };
}

/** Status til Indstillinger: er det sat op, og hvornår blev der sidst hentet? */
export async function fetchApexIndeksStatus() {
  await connectDb();
  const [last] = await Client.find({ "apexIndeks.fetchedAt": { $exists: true } })
    .sort({ "apexIndeks.fetchedAt": -1 })
    .limit(1)
    .select("apexIndeks.fetchedAt")
    .lean();
  const withClickUp = await Client.countDocuments({ customerClickUpId: { $exists: true, $ne: null } });
  const withIndeks = await Client.countDocuments({ "apexIndeks.status": "ok" });
  return {
    configured: isApexIndeksConfigured(),
    lastFetchedAt: last?.apexIndeks?.fetchedAt ? new Date(last.apexIndeks.fetchedAt).toISOString() : null,
    clientsWithClickUpId: withClickUp,
    clientsWithIndeks: withIndeks,
  };
}