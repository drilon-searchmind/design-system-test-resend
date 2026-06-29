"use client";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { IconSparkle } from "@/components/crm/icons";
import { formatReportPeriodSubtitle } from "@/lib/crm/report-period";

/**
 * @param {{
 *   reportPeriod: { year: number; month: number };
 *   onReportPeriodChange: (p: { year: number; month: number }) => void;
 *   dataSource?: "demo" | "database";
 *   mineLabel?: string | null;
 *   loading?: boolean;
 *   refreshing?: boolean;
 * }} props
 */
export function NpsPageHeader({
  reportPeriod,
  onReportPeriodChange,
  dataSource = "demo",
  mineLabel = null,
  loading = false,
  refreshing = false,
}) {
  const subtitle = formatReportPeriodSubtitle(reportPeriod.year, reportPeriod.month);

  const displayName =
    typeof mineLabel === "string" && mineLabel.trim() ?
      mineLabel.trim()
    : dataSource === "demo" ?
      "Louise Madsen"
    : "Dig";

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconSparkle size={14} className="text-agency-brand" aria-hidden />
            Loyalitet & kvalitet
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">NPS</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            <span className="capitalize">{subtitle}</span>
            {" — "}
            Bølger, skabeloner og konti-score ud fra seneste målinger (0–100 som på kundekortene).
            {refreshing ?
              <span className="text-[11px] text-fg-quiet"> · Opdaterer…</span>
            : null}
            {" "}
            Kontekst:{" "}
            <span className="font-semibold text-fg">{loading ? "\u2026" : displayName}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
          <ReportPeriodPicker year={reportPeriod.year} month={reportPeriod.month} onChange={onReportPeriodChange} />
        </div>
      </header>
    </div>
  );
}
