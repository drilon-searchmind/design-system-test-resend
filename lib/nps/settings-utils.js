/** @typedef {{ month: number; day: number }} NpsSendDate */

const MONTH_DA = [
  "januar",
  "februar",
  "marts",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "december",
];

export const DEFAULT_NPS_SEND_DATES = /** @type {NpsSendDate[]} */ ([
  { month: 1, day: 15 },
  { month: 4, day: 15 },
  { month: 7, day: 15 },
  { month: 10, day: 15 },
]);

/**
 * @param {unknown} value
 * @returns {value is NpsSendDate}
 */
export function isValidSendDate(value) {
  if (!value || typeof value !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (value);
  const month = Number(row.month);
  const day = Number(row.day);
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  return daysInMonth(month, 2000) >= day;
}

/**
 * @param {number} month 1–12
 * @param {number} year
 */
export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * @param {unknown[]} raw
 * @returns {NpsSendDate[]}
 */
export function normalizeSendDates(raw) {
  if (!Array.isArray(raw)) return [];
  /** @type {NpsSendDate[]} */
  const out = [];
  const seen = new Set();
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!isValidSendDate(item)) continue;
    const month = Number(item.month);
    const day = Number(item.day);
    const key = `${month}-${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ month, day });
  }
  out.sort((a, b) => a.month - b.month || a.day - b.day);
  return out;
}

/**
 * @param {string} value
 */
export function isValidSendTimeLocal(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? "").trim());
}

/**
 * @param {NpsSendDate} date
 */
export function formatSendDateLabel(date) {
  const month = MONTH_DA[date.month - 1] ?? String(date.month);
  return `${date.day}. ${month}`;
}

/**
 * @param {NpsSendDate[]} sendDates
 * @param {{ from?: Date; limit?: number }} [opts]
 * @returns {{ isoDate: string; label: string; month: number; day: number }[]}
 */
export function computeNextSendOccurrences(sendDates, opts = {}) {
  const dates = normalizeSendDates(sendDates);
  const limit = Math.max(1, Math.min(24, opts.limit ?? 6));
  const from = opts.from ?? new Date();
  const startYear = from.getFullYear();
  /** @type {{ isoDate: string; at: Date; month: number; day: number }[]} */
  const candidates = [];

  for (let year = startYear; year <= startYear + 2; year += 1) {
    for (let di = 0; di < dates.length; di += 1) {
      const d = dates[di];
      const maxDay = daysInMonth(d.month, year);
      if (d.day > maxDay) continue;
      const at = new Date(year, d.month - 1, d.day, 12, 0, 0, 0);
      if (at.getTime() < startOfDay(from).getTime()) continue;
      const y = at.getFullYear();
      const m = String(at.getMonth() + 1).padStart(2, "0");
      const day = String(at.getDate()).padStart(2, "0");
      candidates.push({ isoDate: `${y}-${m}-${day}`, at, month: d.month, day: d.day });
    }
  }

  candidates.sort((a, b) => a.at.getTime() - b.at.getTime());

  return candidates.slice(0, limit).map((row) => ({
    isoDate: row.isoDate,
    label: formatSendDateLabel({ month: row.month, day: row.day }),
    month: row.month,
    day: row.day,
  }));
}

/**
 * @param {Date} d
 */
function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * @param {Date} now
 * @param {NpsSendDate[]} sendDates
 */
export function isScheduledSendDay(now, sendDates) {
  const parts = getCopenhagenParts(now);
  return normalizeSendDates(sendDates).some((d) => d.month === parts.month && d.day === parts.day);
}

/**
 * @param {Date} now
 * @param {string} sendTimeLocal HH:mm
 */
export function isPastSendTimeLocal(now, sendTimeLocal) {
  const time = String(sendTimeLocal ?? "09:00").trim();
  if (!isValidSendTimeLocal(time)) return true;
  const parts = getCopenhagenParts(now);
  const [h, m] = time.split(":").map((x) => Number(x));
  if (parts.hour > h) return true;
  if (parts.hour < h) return false;
  return parts.minute >= m;
}

/**
 * @param {Date} date
 */
export function getCopenhagenParts(date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  /** @type {Record<string, string>} */
  const map = {};
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}
