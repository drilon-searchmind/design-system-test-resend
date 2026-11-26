/**
 * Opsalg og nedsalg — adskilt fra fast MRR, men vist sammen: "20.000 (+5.000 (i))".
 *
 * Opsalg:
 *  - one_time              Engangsbeløb i én måned
 *  - temporary_mrr         Tillæg pr. måned i en periode
 *  - mrr_increase          Fast MRR-stigning (lægges direkte på MRR)
 *
 * Nedsalg:
 *  - one_time_downsell     Engangs-reduktion i én måned
 *  - temporary_mrr_downsell Reduktion pr. måned i en periode
 *  - mrr_decrease          Fast MRR-reduktion (lægges direkte på MRR)
 */

export const UPSELL_TYPES = /** @type {const} */ ({
  one_time: {
    label: "Engangsbeløb",
    hint: "Beløb for én måned (fx video-produktion).",
    direction: "up",
  },
  temporary_mrr: {
    label: "Tillæg i periode",
    hint: "Beløb pr. måned i en periode (fx +8.000 kr./md. frem til januar).",
    direction: "up",
  },
  mrr_increase: {
    label: "Fast MRR-stigning",
    hint: "Lægges direkte på kundens MRR og logges i ændringshistorikken.",
    direction: "up",
  },
  one_time_downsell: {
    label: "Engangs-nedsalg",
    hint: "Reduktion for én måned (fx kreditnota eller midlertidig rabat).",
    direction: "down",
  },
  temporary_mrr_downsell: {
    label: "Nedsalg i periode",
    hint: "Reduktion pr. måned i en periode (fx −5.000 kr./md. frem til marts).",
    direction: "down",
  },
  mrr_decrease: {
    label: "Fast MRR-reduktion",
    hint: "Trækkes direkte fra kundens MRR og logges i ændringshistorikken.",
    direction: "down",
  },
});

/** @typedef {keyof typeof UPSELL_TYPES} UpsellType */

export const UPSELL_DESCRIPTION_MAX_WORDS = 200;

/** Types that change the permanent retainer (already baked into MRR). */
export const UPSELL_BASE_MRR_TYPES = /** @type {const} */ (["mrr_increase", "mrr_decrease"]);

/** Types with a from→to month range. */
export const UPSELL_TEMPORARY_TYPES = /** @type {const} */ (["temporary_mrr", "temporary_mrr_downsell"]);

/**
 * @typedef {object} UpsellItem
 * @property {string} id
 * @property {UpsellType} type
 * @property {number} amount
 * @property {string} currency
 * @property {string} periodFrom "YYYY-MM"
 * @property {string} periodTo "YYYY-MM"
 * @property {string} soldBy Navn på sælger
 * @property {string} [soldByKey] Team-medlem key
 * @property {string} soldAt "YYYY-MM-DD"
 * @property {string} [department]
 * @property {string} description
 * @property {string} [clientId] Kundens slug (til visning på samlede lister)
 * @property {string} [clientName]
 */

/** @param {string | undefined} type */
export function isDownsellType(type) {
  return UPSELL_TYPES[/** @type {UpsellType} */ (type)]?.direction === "down";
}

/** @param {string | undefined} type */
export function isTemporaryUpsellType(type) {
  return UPSELL_TEMPORARY_TYPES.includes(/** @type {never} */ (type));
}

/** @param {string | undefined} type */
export function isBaseMrrUpsellType(type) {
  return UPSELL_BASE_MRR_TYPES.includes(/** @type {never} */ (type));
}

/**
 * Beløb med fortegn til summer: nedsalg er negativt.
 * @param {Pick<UpsellItem, "type" | "amount">} u
 */
export function upsellSignedAmount(u) {
  const n = Math.abs(Number(u.amount) || 0);
  return isDownsellType(u.type) ? -n : n;
}

/** @param {number} year @param {number} month 1-12 */
export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** @param {unknown} ym */
export function isMonthKey(ym) {
  return typeof ym === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

/** @param {string} ym "YYYY-MM" → "sep. 2026" */
export function formatMonthKeyDa(ym) {
  if (!isMonthKey(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("da-DK", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** @param {UpsellItem} u */
export function formatUpsellPeriodDa(u) {
  return u.periodFrom === u.periodTo ?
      formatMonthKeyDa(u.periodFrom)
    : `${formatMonthKeyDa(u.periodFrom)} – ${formatMonthKeyDa(u.periodTo)}`;
}

/**
 * Tæller opsalget/nedsalget med i den givne måned?
 * @param {Pick<UpsellItem, "periodFrom" | "periodTo">} u
 * @param {string} ym
 */
export function isUpsellActiveInMonth(u, ym) {
  return u.periodFrom <= ym && ym <= u.periodTo;
}

/**
 * "Oven i MRR" for en måned. Fast MRR-ændring tæller ikke med (indgår allerede i MRR).
 * @param {UpsellItem[] | undefined} upsells
 * @param {string} ym
 * @returns {{ amount: number; items: UpsellItem[] }}
 */
export function summarizeUpsellsForMonth(upsells, ym) {
  const items = (upsells ?? []).filter(
    (u) => !isBaseMrrUpsellType(u.type) && isUpsellActiveInMonth(u, ym),
  );
  return { amount: items.reduce((s, u) => s + upsellSignedAmount(u), 0), items };
}

/** @param {string} text */
export function countWords(text) {
  const t = String(text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Validerer input til et nyt opsalg/nedsalg.
 * @param {Record<string, unknown>} raw
 * @returns {{ value: { type: UpsellType; amount: number; periodFrom: string; periodTo: string; soldBy: string; soldByKey?: string; soldAt: string; department?: string; description: string } } | { error: string }}
 */
export function validateUpsellInput(raw) {
  const type = String(raw.type ?? "");
  if (!(type in UPSELL_TYPES)) return { error: "Vælg en type" };
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Beløb skal være større end 0" };
  const soldBy = String(raw.soldBy ?? "").trim();
  if (!soldBy) {
    return { error: isDownsellType(type) ? "Vælg hvem der registrerede nedsalget" : "Vælg hvem der solgte opsalget" };
  }
  const soldAt = String(raw.soldAt ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(soldAt)) return { error: "Angiv salgsdato" };
  const periodFrom = String(raw.periodFrom ?? "").trim();
  if (!isMonthKey(periodFrom)) return { error: "Angiv måned for aftalen" };
  const periodToRaw = String(raw.periodTo ?? "").trim();
  const periodTo = isTemporaryUpsellType(type) && periodToRaw ? periodToRaw : periodFrom;
  if (!isMonthKey(periodTo)) return { error: "Ugyldig slutmåned" };
  if (periodTo < periodFrom) return { error: "Slutmåned kan ikke ligge før startmåned" };
  const description = String(raw.description ?? "").trim();
  if (!description) return { error: "Skriv en kort beskrivelse" };
  if (countWords(description) > UPSELL_DESCRIPTION_MAX_WORDS) {
    return { error: `Beskrivelsen må højst være ${UPSELL_DESCRIPTION_MAX_WORDS} ord` };
  }
  const department = String(raw.department ?? "").trim();
  const soldByKey = String(raw.soldByKey ?? "").trim();
  return {
    value: {
      type: /** @type {UpsellType} */ (type),
      amount: Math.round(amount),
      periodFrom,
      periodTo,
      soldBy,
      ...(soldByKey ? { soldByKey } : {}),
      soldAt,
      ...(department ? { department } : {}),
      description,
    },
  };
}
