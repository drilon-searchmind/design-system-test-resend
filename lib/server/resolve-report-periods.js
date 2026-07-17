import {
  normalizeReportPeriod,
  normalizeReportPeriodSelection,
  parseReportPeriodKey,
  periodsToInclusiveDateRange,
  primaryReportPeriod,
  sortReportPeriods,
  uniqueReportPeriods,
} from "@/lib/crm/report-period";

/**
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 */
export function resolveReportPeriodsFromSearchParams(searchParams) {
  const monthsParam = searchParams.get("months");
  if (monthsParam) {
    const months = monthsParam
      .split(",")
      .map((part) => parseReportPeriodKey(part.trim()))
      .filter(Boolean);
    if (months.length) {
      return normalizeReportPeriodSelection({ months }).months;
    }
  }

  const from = searchParams.get("from")?.trim().slice(0, 10) ?? "";
  const to = searchParams.get("to")?.trim().slice(0, 10) ?? "";
  if (from && to) {
    return monthsFromInclusiveRange(from, to);
  }

  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  return [normalizeReportPeriod({ year, month })];
}

/**
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 */
export function resolveReportPeriodRequest(searchParams) {
  const periods = resolveReportPeriodsFromSearchParams(searchParams);
  const primary = primaryReportPeriod({ months: periods });
  const range = periodsToInclusiveDateRange(periods);
  return { periods, primary, range };
}

/**
 * @param {string} fromIso
 * @param {string} toIso
 */
function monthsFromInclusiveRange(fromIso, toIso) {
  const fromMatch = fromIso.match(/^(\d{4})-(\d{2})-\d{2}$/);
  const toMatch = toIso.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!fromMatch || !toMatch) {
    return [normalizeReportPeriod({})];
  }

  let y = Number(fromMatch[1]);
  let m = Number(fromMatch[2]);
  const endY = Number(toMatch[1]);
  const endM = Number(toMatch[2]);

  /** @type {import('@/lib/crm/report-period').ReportPeriod[]} */
  const months = [];
  while (y < endY || (y === endY && m <= endM)) {
    months.push(normalizeReportPeriod({ year: y, month: m }));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (months.length > 60) break;
  }

  return uniqueReportPeriods(months.length ? months : [normalizeReportPeriod({})]);
}

/**
 * Merge fetch opts with resolved period request.
 * @param {Record<string, unknown>} opts
 * @param {ReturnType<typeof resolveReportPeriodRequest>} resolved
 */
export function withReportPeriodRequest(opts, resolved) {
  const { periods, primary, range } = resolved;
  return {
    ...opts,
    year: primary.year,
    month: primary.month,
    periods: sortReportPeriods(periods),
    fromIso: range.fromIso,
    toIso: range.toIso,
  };
}
