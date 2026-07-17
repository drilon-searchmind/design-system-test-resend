const DKK = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

const EURO = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const PCT = new Intl.NumberFormat("da-DK", {
  style: "percent",
  maximumFractionDigits: 1,
});

const COMPACT = new Intl.NumberFormat("da-DK", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const DKK_COMPACT = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  notation: "compact",
  maximumFractionDigits: 1,
});

const EUR_COMPACT = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * @param {number} value
 * @param {string} [currency="DKK"]
 */
export function formatCurrency(value, currency = "DKK") {
  if (currency === "EUR") return EURO.format(value);
  return DKK.format(value);
}

/** @param {number} ratio 0–1 */
export function formatPercent(ratio) {
  return PCT.format(ratio);
}

/** @param {number} value */
export function formatCompactNumber(value) {
  return COMPACT.format(value);
}

/**
 * Compact currency for dense tables / charts (DESIGN-SEARCHMINDOS).
 * @param {number} value
 * @param {string} [currency="DKK"]
 */
export function formatCurrencyCompact(value, currency = "DKK") {
  if (currency === "EUR") return EUR_COMPACT.format(value);
  return DKK_COMPACT.format(value);
}

/** @param {string} [iso] ISO date or datetime */
export function formatCommentDateTimeEn(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const trimmed = iso.trim();
  let d = new Date(trimmed);
  if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    d = new Date(`${trimmed}T12:00:00`);
  }
  if (Number.isNaN(d.getTime())) return "—";
  const month = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day} at ${hours}:${minutes}`;
}

/** @param {string} [iso] YYYY-MM-DD */
export function formatIsoDateDa(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

/** @param {number} hours */
export function formatHoursCompactDa(hours) {
  if (!Number.isFinite(hours)) return "0";
  const rounded = Math.round(hours * 100) / 100;
  return rounded.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * @param {number} actual
 * @param {number} budget
 */
export function formatHoursBudgetPairDa(actual, budget) {
  const budgetLabel = budget > 0 ? formatHoursCompactDa(budget) : "—";
  return `${formatHoursCompactDa(actual)}/${budgetLabel}t`;
}

/** @param {number} totalMinutes */
export function formatMinutesDa(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 m";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} m`;
}

/**
 * Decimal timer med da-DK — fx 4,2 t (DESIGN-SEARCHMINDOS: suffixed `t`).
 * @param {number} totalMinutes
 */
export function formatHoursDecimalDa(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 t";
  const h = totalMinutes / 60;
  return `${h.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} t`;
}

/** @param {string} [iso] YYYY-MM-DD */
export function formatIsoDayMonthDa(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const p = formatIsoDateDa(iso).split(".");
  return p.length >= 2 ? `${p[0]}.${p[1]}` : iso;
}

/** Ugentlig ugedag + dato fx "Fredag 8. maj 2026" (`iso` lokalt kalenderdøgn). */
export function formatIsoWeekdayLongDa(iso) {
  const head = typeof iso === "string" ? iso.trim().slice(0, 10) : "";
  if (head.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(head)) return "—";
  const [yS, moS, dS] = head.split("-");
  const y = Number.parseInt(yS, 10);
  const m = Number.parseInt(moS, 10);
  const day = Number.parseInt(dS, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return "—";
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return "—";
  const s = new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}
