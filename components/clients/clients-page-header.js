"use client";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { formatReportPeriodSelectionSubtitle } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   selection: import('@/lib/crm/report-period').ReportPeriodSelection;
 *   onSelectionChange: (selection: import('@/lib/crm/report-period').ReportPeriodSelection) => void;
 *   subtitle?: string;
 *   refreshing?: boolean;
 *   loading?: boolean;
 *   clients?: import('@/lib/crm/pulse-types').PulseClient[] | null;
 *   onOpenCreate?: () => void;
 *   createModalOpen?: boolean;
 *   dataSource?: "demo" | "database";
 * }} props
 */
export function ClientsPageHeader({
  selection,
  onSelectionChange,
  subtitle: subtitleProp,
  refreshing = false,
  loading = false,
  clients = null,
  onOpenCreate,
  createModalOpen = false,
  dataSource = "demo",
}) {
  const subtitle = subtitleProp ?? formatReportPeriodSelectionSubtitle(selection);
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

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          {onOpenCreate && dataSource === "database" ?
            <button
              type="button"
              onClick={onOpenCreate}
              aria-haspopup="dialog"
              aria-expanded={createModalOpen}
              className={cn(
                "inline-flex h-[34px] items-center rounded-md border px-4 font-sans text-[13px] font-medium",
                createModalOpen ?
                  "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                : "border-border bg-surface-muted text-fg-muted hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand",
              )}
            >
              Ny kunde
            </button>
          : null}
        </div>
        <ReportPeriodPicker selection={selection} onSelectionChange={onSelectionChange} />
      </div>
    </header>
  );
}
