/**
 * Opsalg (upsells) — adskilt fra fast MRR, men vist sammen: "20.000 (+5.000 (i))".
 *
 * Typer:
 *  - one_time     Engangsbeløb i én måned (fx video-produktion, 15.000 kr.)
 *  - temporary_mrr Tillæg pr. måned i en periode (fx +8.000/md. frem til januar)
 *  - mrr_increase Fast MRR-stigning (fx +7.000 → lægges på kundens MRR og logges)
 */

export const UPSELL_TYPES = /** @type {const} */ ({
  one_time: {
    label: "Engangsbeløb",
    hint: "Beløb for én måned (fx video-produktion).",
  },
  temporary_mrr: {
    label: "Tillæg i periode",
    hint: "Beløb pr. måned i en periode (fx +8.000 kr./md. frem til januar).",
  },
  mrr_increase: {
    label: "Fast MRR-stigning",
    hint: "Lægges direkte på kundens MRR og logges i ændringshistorikken.",
  },
});

/** @typedef {keyof typeof UPSELL_TYPES} UpsellType */

export const UPSELL_DESCRIPTION_MAX_WORDS = 200;

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
 * Tæller opsalget med i den givne måned?
 * @param {Pick<UpsellItem, "periodFrom" | "periodTo">} u
 * @param {string} ym
 */
export function isUpsellActiveInMonth(u, ym) {
  return u.periodFrom <= ym && ym <= u.periodTo;
}

/**
 * "Oven i MRR" for en måned. mrr_increase tæller ikke med (indgår allerede i MRR).
 * @param {UpsellItem[] | undefined} upsells
 * @param {string} ym
 * @returns {{ amount: number; items: UpsellItem[] }}
 */
export function summarizeUpsellsForMonth(upsells, ym) {
  const items = (upsells ?? []).filter(
    (u) => u.type !== "mrr_increase" && isUpsellActiveInMonth(u, ym),
  );
  return { amount: items.reduce((s, u) => s + (Number(u.amount) || 0), 0), items };
}

/** @param {string} text */
export function countWords(text) {
  const t = String(text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Validerer input til et nyt opsalg.
 * @param {Record<string, unknown>} raw
 * @returns {{ value: { type: UpsellType; amount: number; periodFrom: string; periodTo: string; soldBy: string; soldByKey?: string; soldAt: string; department?: string; description: string } } | { error: string }}
 */
export function validateUpsellInput(raw) {
  const type = String(raw.type ?? "");
  if (!(type in UPSELL_TYPES)) return { error: "Vælg en type" };
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Beløb skal være større end 0" };
  const soldBy = String(raw.soldBy ?? "").trim();
  if (!soldBy) return { error: "Vælg hvem der solgte opsalget" };
  const soldAt = String(raw.soldAt ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(soldAt)) return { error: "Angiv salgsdato" };
  const periodFrom = String(raw.periodFrom ?? "").trim();
  if (!isMonthKey(periodFrom)) return { error: "Angiv måned for aftalen" };
  const periodToRaw = String(raw.periodTo ?? "").trim();
  const periodTo = type === "temporary_mrr" && periodToRaw ? periodToRaw : periodFrom;
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