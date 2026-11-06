/**
 * Fælles kunde-nøgletal til Pulse/Kunder: Indeks, seneste NPS og samlet sundhedsscore.
 */

/**
 * Midlertidigt Indeks indtil Apex (YoY, seneste 30 dage) er koblet på.
 * 100 = uændret ift. sidste år. Deterministisk pr. kunde-id, så tallene er stabile.
 *
 * @param {string} id
 * @returns {number}
 */
export function mockIndeks(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (h >>> 0) % 71; // 0..70
  return 70 + n; // 70..140
}

/**
 * Seneste NPS (0-100 visningsskala) fra en historik sorteret ældst → nyest.
 *
 * @param {{ score?: number }[] | undefined | null} history
 * @returns {number | null}
 */
export function latestNpsFromHistory(history) {
  if (!Array.isArray(history) || !history.length) return null;
  const last = history[history.length - 1];
  return typeof last?.score === "number" && Number.isFinite(last.score) ? last.score : null;
}

/** @param {number} v @param {number} lo @param {number} hi */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Samlet sundhedsscore 0-100 baseret på Indeks, NPS og tidsforbrug ift. retainer.
 * Tid: timer brugt / timebudget (budget afledes af retainer-aftalen). Over budget straffes.
 *
 * @param {{ indeks?: number | null; latestNps?: number | null; hoursThisMonth?: number; hoursBudget?: number }} c
 * @returns {number}
 */
export function clientHealthScore(c) {
  const indeks = typeof c.indeks === "number" ? c.indeks : 100;
  const indeksScore = clamp(50 + (indeks - 100) * 1.25, 0, 100);
  const npsScore = typeof c.latestNps === "number" ? clamp(c.latestNps, 0, 100) : 50;
  const budget = c.hoursBudget ?? 0;
  const util = budget > 0 ? (c.hoursThisMonth ?? 0) / budget : null;
  const timeScore = util == null ? 50 : util <= 1 ? 100 : clamp(100 - (util - 1) * 150, 0, 100);
  return Math.round(indeksScore * 0.35 + npsScore * 0.35 + timeScore * 0.3);
}
