/**
 * Month buckets for 12-month KPI trends (used by `KpiTrendHover`). Safe on server and client.
 */

/**
 * The last `count` months ending with the month of `end`, oldest first. Label e.g. "dec. 25".
 * @param {Date} [end]
 * @param {number} [count]
 * @returns {{ key: string; label: string; year: number; month: number; start: Date; end: Date }[]}
 */
export function lastMonths(end = new Date(), count = 12) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    out.push({
      key: monthKey(start),
      label: start.toLocaleDateString("da-DK", { month: "short", year: "2-digit" }),
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      start,
      end: next,
    });
  }
  return out;
}

/** @param {Date | string | number} d */
export function monthKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sum values into the last-12-month buckets. Items outside the window are ignored.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Date | string | number | null | undefined} getDate
 * @param {(item: T) => number} getValue
 * @param {Date} [end]
 * @returns {{ label: string; value: number }[]}
 */
export function sumByMonth(items, getDate, getValue, end = new Date()) {
  const months = lastMonths(end);
  const totals = new Map(months.map((m) => [m.key, 0]));
  for (const item of items) {
    const raw = getDate(item);
    if (raw == null) continue;
    const key = monthKey(raw);
    if (!totals.has(key)) continue;
    const v = getValue(item);
    if (Number.isFinite(v)) totals.set(key, (totals.get(key) ?? 0) + v);
  }
  return months.map((m) => ({ label: m.label, value: totals.get(m.key) ?? 0 }));
}
