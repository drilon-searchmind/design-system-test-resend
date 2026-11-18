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

/** @param {unknown} v */
function finiteNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Timer og budget til tidsdelen. For en kundegruppe tæller kun aktive brands, så et opsagt
 * brands timebudget ikke får gruppen til at se underforbrugt ud.
 *
 * @param {{ hoursThisMonth?: number; hoursBudget?: number; isGroup?: boolean; brands?: { status?: string; hoursThisMonth?: number; hoursBudget?: number }[] }} c
 */
function healthHours(c) {
  if (c.isGroup && Array.isArray(c.brands)) {
    const active = c.brands.filter((b) => b.status === "active");
    if (active.length) {
      return {
        hours: active.reduce((s, b) => s + (finiteNumber(b.hoursThisMonth) ?? 0), 0),
        budget: active.reduce((s, b) => s + (finiteNumber(b.hoursBudget) ?? 0), 0),
      };
    }
  }
  return { hours: finiteNumber(c.hoursThisMonth) ?? 0, budget: finiteNumber(c.hoursBudget) ?? 0 };
}

/** Mindste antal komponenter med data, før en kunde får en sundhedsscore. */
export const MIN_HEALTH_PARTS = 2;

const COPENHAGEN_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const MIN_PRORATE_DAYS = 5;

/**
 * Andel af måneden der er gået (dags dato i Europe/Copenhagen, inkl. i dag).
 * Regnes som mindst 5 dage, så få timer i starten af måneden ikke ligner overforbrug.
 * null for afsluttede måneder eller hvis perioden ikke er kendt.
 *
 * @param {{ year: number; month: number } | null | undefined} period måned 1–12
 * @param {Date} now
 * @returns {{ factor: number; elapsedDays: number; daysInMonth: number } | null}
 */
function monthElapsedShare(period, now) {
  if (!period?.year || !period?.month) return null;
  const parts = Object.fromEntries(COPENHAGEN_DATE.formatToParts(now).map((p) => [p.type, Number(p.value)]));
  if (period.year !== parts.year || period.month !== parts.month) return null;
  const daysInMonth = new Date(period.year, period.month, 0).getDate();
  const elapsedDays = Math.min(daysInMonth, Math.max(1, parts.day));
  const countedDays = Math.min(daysInMonth, Math.max(MIN_PRORATE_DAYS, elapsedDays));
  return { factor: countedDays / daysInMonth, elapsedDays, daysInMonth };
}

/**
 * @typedef {object} HealthPart
 * @property {'indeks' | 'nps' | 'time'} key
 * @property {string} label
 * @property {string} raw Rå værdi til visning (fx "112", "64", "38 / 40 t (95 %)") eller "mangler"
 * @property {string} rule Hvordan delscoren regnes
 * @property {string} [note] Ekstra forklaring (fx forholdsmæssigt budget i indeværende måned)
 * @property {number | null} score Delscore 0-100 (null = data mangler, indgår ikke)
 * @property {number} weight Konfigureret relativ vægt
 * @property {number} weightPct Effektiv vægt i % efter normalisering over de komponenter der har data
 */

/**
 * @typedef {object} HealthBreakdown
 * @property {number | null} total Samlet score 0-100, null hvis færre end `MIN_HEALTH_PARTS` komponenter har data
 * @property {HealthPart[]} parts
 * @property {number} usedCount Antal komponenter med data
 */

/**
 * Sundhedsscore (0-100) med delscorer, baseret på Indeks, NPS og tidsforbrug ift. timebudget.
 * Komponenter uden data (intet Indeks, ingen NPS, intet timebudget) udelades, og vægtene
 * normaliseres over de resterende — de tæller altså ikke som et neutralt 50. Har kunden data
 * for færre end `MIN_HEALTH_PARTS` komponenter, gives ingen score.
 *
 * I indeværende måned sammenlignes timerne med budgettet forholdsmæssigt (andel af måneden
 * der er gået), så en kunde ikke ser underforbrugt ud tidligt på måneden.
 *
 * @param {{ indeks?: number | null; latestNps?: number | null; hoursThisMonth?: number; hoursBudget?: number; isGroup?: boolean; brands?: any[] }} c
 * @param {import("@/lib/crm/agency-settings").AgencySettings} [settings] justerbare parametre (standard hvis udeladt)
 * @param {{ period?: { year: number; month: number } | null; now?: Date }} [options] `period` = måneden timerne gælder for; uden den bruges fuldt budget
 * @returns {HealthBreakdown}
 */
export function clientHealthBreakdown(c, settings = DEFAULT_AGENCY_SETTINGS, options = {}) {
  const fmt = (/** @type {number} */ n) => n.toLocaleString("da-DK", { maximumFractionDigits: 2 });

  const indeks = finiteNumber(c.indeks);
  const indeksScore = indeks == null ? null : clamp(50 + (indeks - 100) * settings.indeksSensitivity, 0, 100);

  const nps = finiteNumber(c.latestNps);
  const npsScore = nps == null ? null : clamp(nps, 0, 100);

  const { hours, budget: fullBudget } = healthHours(c);
  const share = fullBudget > 0 ? monthElapsedShare(options.period, options.now ?? new Date()) : null;
  const budget = share ? fullBudget * share.factor : fullBudget;
  const util = budget > 0 ? hours / budget : null;
  const timeScore =
    util == null ? null
    : util <= 1 ? 100
    : clamp(100 - (util - 1) * settings.overBudgetPenalty, 0, 100);

  /** @type {Omit<HealthPart, "weightPct">[]} */
  const raw = [
    {
      key: "indeks",
      label: "Indeks",
      raw: indeks == null ? "mangler" : String(indeks),
      rule: `50 + (Indeks − 100) × ${fmt(settings.indeksSensitivity)}`,
      score: indeksScore,
      weight: settings.weightIndeks,
    },
    {
      key: "nps",
      label: "NPS",
      raw: nps == null ? "mangler" : String(nps),
      rule: "Seneste NPS-svar på skala 0–100",
      score: npsScore,
      weight: settings.weightNps,
    },
    {
      key: "time",
      label: "Tid brugt",
      raw:
        util == null ? "intet timebudget"
        : `${fmt(Math.round(hours * 10) / 10)} / ${fmt(Math.round(budget * 10) / 10)} t (${Math.round(util * 100)} %)`,
      rule: `≤ 100 % af budget = 100, ellers 100 − overforbrug × ${fmt(settings.overBudgetPenalty)}`,
      ...(share ?
        {
          note: `Budget pr. i dag: ${fmt(Math.round(budget * 10) / 10)} af ${fmt(fullBudget)} t (${Math.round(share.factor * 100)} % af måneden, dag ${share.elapsedDays} af ${share.daysInMonth})`,
        }
      : {}),
      score: timeScore,
      weight: settings.weightTime,
    },
  ];

  // Delscorer afrundes før vægtning, så tallene i hover-forklaringen giver præcis totalen.
  const rounded = raw.map((p) => ({ ...p, score: p.score == null ? null : Math.round(p.score) }));
  const used = rounded.filter((p) => p.score != null && p.weight > 0);
  const wSum = used.reduce((s, p) => s + p.weight, 0);
  const total =
    used.length >= MIN_HEALTH_PARTS && wSum > 0 ?
      Math.round(used.reduce((s, p) => s + /** @type {number} */ (p.score) * p.weight, 0) / wSum)
    : null;

  return {
    total,
    usedCount: used.length,
    parts: rounded.map((p) => ({
      ...p,
      weightPct: p.score != null && p.weight > 0 && wSum > 0 ? Math.round((p.weight / wSum) * 100) : 0,
    })),
  };
}

/**
 * Samlet sundhedsscore 0-100 (se `clientHealthBreakdown`). null hvis der ikke er data nok.
 *
 * @param {Parameters<typeof clientHealthBreakdown>[0]} c
 * @param {import("@/lib/crm/agency-settings").AgencySettings} [settings]
 * @param {Parameters<typeof clientHealthBreakdown>[2]} [options]
 * @returns {number | null}
 */
export function clientHealthScore(c, settings = DEFAULT_AGENCY_SETTINGS, options) {
  return clientHealthBreakdown(c, settings, options).total;
}