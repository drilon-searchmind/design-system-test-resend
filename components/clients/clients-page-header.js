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
 *   clients?: import('@/lib/crm/pulse-types').PulseClient[] | null;
 * }} props
 */
export function ClientsPageHeader({
  period,
  onPeriodChange,
  refreshing = false,
  loading = false,
  clients = null,
}) {
  const subtitle = formatReportPeriodSubtitle(period.year, period.month);
  let bodyLine = "";

  if (loading && !clients) {
    bodyLine = "Indlæser portefølje…";
  } else if (clients && clients.length > 0) {
    const unhealthy = clients.filter((c) => c.health !== "ok").length;
    const overBudget = clients.filter((c) => c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget).length;
    bodyLine = `${clients.length} kunder i porteføljen`;
    if (unhealthy > 0) bodyLine += ` · ${unhealthy} med sundhedsadvarsler`;
    if (overBudget > 0) bodyLine += ` · ${overBudget} over timebudget`;
  } else if (clients?.length === 0) {
    bodyLine = "Ingen kunder endnu";
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Portefølje
        </p>
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">Kunder</h1>
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
