"use client";

import { IconSparkle } from "@/components/crm/icons";
import { formatReportPeriodSubtitle } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   reportPeriod: { year: number; month: number };
 *   loading?: boolean;
 *   refreshing?: boolean;
 * }} props
 */
export function NpsPageHeader({ reportPeriod, loading = false, refreshing = false }) {
  const subtitle = formatReportPeriodSubtitle(reportPeriod.year, reportPeriod.month);

  return (
    <div className="flex flex-col gap-3">
      <header className="border-b border-border/70 pb-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconSparkle size={14} className="text-agency-brand" aria-hidden />
            Loyalitet & kvalitet
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">NPS</h1>
          <p
            className={cn(
              "mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted transition-opacity",
              refreshing && "opacity-60",
            )}
          >
            <span className="capitalize">{loading ? "…" : subtitle}</span>
            {" — "}
            Bureauoversigt over bølger, skabeloner og konti-score ud fra seneste målinger (0–100 som på kundekortene).
            {refreshing ?
              <span className="text-[11px] text-fg-quiet"> · Opdaterer…</span>
            : null}
          </p>
        </div>
      </header>
    </div>
  );
}
