import {
  lastCalendarDayIsoOfReportMonth,
  normalizeReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";

/**
 * @param {{ year?: number; month?: number; fromIso?: string; toIso?: string }} opts
 */
export function reportPeriodWindowFromOpts(opts = {}) {
  if (typeof opts.fromIso === "string" && typeof opts.toIso === "string") {
    const fromMatch = opts.fromIso.match(/^(\d{4})-(\d{2})-\d{2}$/);
    const toMatch = opts.toIso.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (fromMatch && toMatch) {
      const fromYear = Number(fromMatch[1]);
      const fromMonth = Number(fromMatch[2]);
      const toYear = Number(toMatch[1]);
      const toMonth = Number(toMatch[2]);
      const monthStart = startOfReportMonth(fromYear, fromMonth);
      const monthLastIso = opts.toIso.slice(0, 10);
      const monthEnd = new Date(`${monthLastIso}T23:59:59.999Z`);
      return {
        monthStart,
        monthEnd,
        monthLastIso,
        primary: normalizeReportPeriod({ year: toYear, month: toMonth }),
      };
    }
  }

  const primary = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const monthStart = startOfReportMonth(primary.year, primary.month);
  const monthLastIso = lastCalendarDayIsoOfReportMonth(primary.year, primary.month);
  const monthEnd = new Date(`${monthLastIso}T23:59:59.999Z`);
  return { monthStart, monthEnd, monthLastIso, primary };
}
