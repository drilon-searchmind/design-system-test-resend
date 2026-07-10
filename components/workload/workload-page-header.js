"use client";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { IconChart } from "@/components/crm/icons";
import { formatReportPeriodSubtitle } from "@/lib/crm/report-period";

/**
 * @param {{
 *   reportPeriod: { year: number; month: number };
 *   onReportPeriodChange: (p: { year: number; month: number }) => void;
 *   dataSource?: "demo" | "database";
 *   mineLabel?: string | null;
 *   refreshing?: boolean;
 *   loading?: boolean;
 * }} props
 */
export function WorkloadPageHeader({
  reportPeriod,
  onReportPeriodChange,
  dataSource = "demo",
  mineLabel = null,
  refreshing = false,
  loading = false,
}) {
  const subtitle = formatReportPeriodSubtitle(reportPeriod.year, reportPeriod.month);
  const hasMine = typeof mineLabel === "string" && mineLabel.trim();

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconChart size={14} className="text-agency-brand" aria-hidden />
            Kapacitet & belægning
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">Belægning</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            <span className="capitalize">{subtitle}</span>
            {" — "}Disciplin-matrix, teamliste og efterspørgsel fra opgaver.
            {refreshing ?
              <span className="text-[11px] text-fg-quiet"> · Opdaterer…</span>
            : null}
            {hasMine ?
              <>
                {" "}
                Din række: <span className="font-semibold text-fg">{loading ? "\u2026" : mineLabel.trim()}</span>
              </>
            : null}
            {dataSource === "demo" && !hasMine ?
              <span className="text-[11px] text-fg-quiet"> · Demodata</span>
            : null}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
          <ReportPeriodPicker year={reportPeriod.year} month={reportPeriod.month} onChange={onReportPeriodChange} />
        </div>
      </header>
    </div>
  );
}
