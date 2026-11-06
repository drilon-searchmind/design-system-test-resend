/**
 * Fælles kunde-nøgletal til Pulse/Kunder: Indeks, seneste NPS og samlet sundhedsscore.
 */

import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";

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
 * Sundhedsscore (0-100) med delscorer, baseret på Indeks, NPS og tidsforbrug ift. retainer.
 * Tid: timer brugt / timebudget (budget afledes af retainer-aftalen). Over budget straffes.
 *
 * @param {{ indeks?: number | null; latestNps?: number | null; hoursThisMonth?: number; hoursBudget?: number }} c
 * @param {import("@/lib/crm/agency-settings").AgencySettings} [settings] justerbare parametre (standard hvis udeladt)
 */
export function clientHealthBreakdown(c, settings = DEFAULT_AGENCY_SETTINGS) {
  const indeks = typeof c.indeks === "number" ? c.indeks : 100;
  const indeksScore = clamp(50 + (indeks - 100) * settings.indeksSensitivity, 0, 100);
  const npsScore = typeof c.latestNps === "number" ? clamp(c.latestNps, 0, 100) : 50;
  const budget = c.hoursBudget ?? 0;
  const util = budget > 0 ? (c.hoursThisMonth ?? 0) / budget : null;
  const timeScore = util == null ? 50 : util <= 1 ? 100 : clamp(100 - (util - 1) * settings.overBudgetPenalty, 0, 100);
  const wSum = settings.weightIndeks + settings.weightNps + settings.weightTime || 1;
  const total = Math.round(
    (indeksScore * settings.weightIndeks + npsScore * settings.weightNps + timeScore * settings.weightTime) /
      wSum,
  );
  return {
    total,
    parts: [
      { label: "Indeks", score: Math.round(indeksScore), weightPct: Math.round((settings.weightIndeks / wSum) * 100) },
      { label: "NPS", score: Math.round(npsScore), weightPct: Math.round((settings.weightNps / wSum) * 100) },
      { label: "Tid brugt", score: Math.round(timeScore), weightPct: Math.round((settings.weightTime / wSum) * 100) },
    ],
  };
}

/**
 * Samlet sundhedsscore 0-100 (se `clientHealthBreakdown`).
 *
 * @param {Parameters<typeof clientHealthBreakdown>[0]} c
 * @param {import("@/lib/crm/agency-settings").AgencySettings} [settings]
 * @returns {number}
 */
export function clientHealthScore(c, settings = DEFAULT_AGENCY_SETTINGS) {
  return clientHealthBreakdown(c, settings).total;
}