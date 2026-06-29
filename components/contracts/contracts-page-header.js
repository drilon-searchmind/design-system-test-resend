"use client";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { formatReportPeriodSubtitle } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   period: { year: number; month: number };
 *   onPeriodChange: (p: { year: number; month: number }) => void;
 *   refreshing?: boolean;
 *   loading?: boolean;
 *   summary?: {
 *     total: number;
 *     renewalSoonCount: number;
 *     pausedCount: number;
 *     mrrOverlapActiveDkk: number;
 *   } | null;
 * }} props
 */
export function ContractsPageHeader({
  period,
  onPeriodChange,
  refreshing = false,
  loading = false,
  summary = null,
}) {
  const subtitle = formatReportPeriodSubtitle(period.year, period.month);

  /** @type {string} */
  let bodyLine = "";

  if (loading && summary == null) {
    bodyLine = "Indlæser aftaler…";
  } else if (summary != null && summary.total > 0) {
    bodyLine = `${summary.total} kontrakter i registeret`;
    if (summary.renewalSoonCount > 0) {
      bodyLine += ` · ${summary.renewalSoonCount} kræver fornyelsesfokus (≤90 d, ref. periodeslut)`;
    }
    if (summary.pausedCount > 0) bodyLine += ` · ${summary.pausedCount} i pause/kladde`;
    bodyLine +=
      summary.mrrOverlapActiveDkk > 0
        ? ` · ${summary.mrrOverlapActiveDkk.toLocaleString("da-DK")} kr. månedligt (aktive, overlap md.)`
        : "";
  } else if (summary != null && summary.total === 0) {
    bodyLine = "Ingen kontrakter endnu";
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Aftaler
        </p>
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">
          Kontrakter
        </h1>
        <p
          className={cn(
            "mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted transition-opacity",
            refreshing && "opacity-60",
          )}
        >
          <span className="capitalize">{subtitle}</span>
          {bodyLine ? <> · {bodyLine}</> : null}
        </p>
      </div>

      <ReportPeriodPicker year={period.year} month={period.month} onChange={onPeriodChange} />
    </header>
  );
}
