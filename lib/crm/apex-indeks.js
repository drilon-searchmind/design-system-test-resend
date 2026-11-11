/** Hjælpere til Apex YoY Indeks (synkroniseret ind i Client.apexIndeks). */

/** Efter så mange timer uden opdatering vises Indeks som forældet. */
export const APEX_INDEKS_STALE_HOURS = 72;

/** @type {Record<string, string>} */
export const APEX_INDEKS_STATUS_LABELS = {
  ok: "OK",
  no_data: "Ingen data (fx ingen tilsluttet kanal)",
  insufficient_history: "Ingen data fra sidste år at sammenligne med",
  error: "Fejl i Apex (fx manglende adgang til GA4)",
  pending: "Ikke beregnet endnu",
};

/**
 * Er tidspunktet ældre end grænsen?
 * @param {string | Date | null | undefined} computedAt
 * @param {number} [nowMs]
 */
export function isApexIndeksStale(computedAt, nowMs = Date.now()) {
  if (!computedAt) return false;
  const t = new Date(computedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t > APEX_INDEKS_STALE_HOURS * 3_600_000;
}

/**
 * Felter til Pulse-klienten ud fra et Client-dokument. `indeks` sættes kun når status er "ok"
 * og tallet er endeligt — aldrig 100 som fallback.
 *
 * @param {Record<string, unknown>} doc
 */
export function apexIndeksFields(doc) {
  const a = doc.apexIndeks;
  if (!a || typeof a !== "object") return {};
  const x = /** @type {Record<string, unknown>} */ (a);
  const status = typeof x.status === "string" ? x.status : undefined;
  const value = typeof x.indeks === "number" && Number.isFinite(x.indeks) ? x.indeks : null;
  const computedAt = x.computedAt ? new Date(String(x.computedAt)).toISOString() : undefined;
  return {
    ...(status === "ok" && value !== null ? { indeks: Math.round(value) } : {}),
    ...(status ? { indeksStatus: status } : {}),
    ...(computedAt ? { indeksComputedAt: computedAt } : {}),
    ...(x.partial === true ? { indeksPartial: true } : {}),
  };
}