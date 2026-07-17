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
 *   summary?: {
 *     total: number;
 *     openCount: number;
 *     overdueCount: number;
 *     mineCount: number;
 *     highOpen: number;
 *   } | null;
 *   mineLabel?: string | null;
 *   assigneeFilterLabel?: string | null;
 *   taskDueReferenceIso?: string;
 *   periodLabel?: string;
 *   onOpenCreate?: () => void;
 *   createModalOpen?: boolean;
 *   dataSource: "demo" | "database";
 * }} props
 */
export function TasksPageHeader({
  selection,
  onSelectionChange,
  subtitle: subtitleProp,
  refreshing = false,
  loading = false,
  summary = null,
  mineLabel: _mineLabel = null,
  assigneeFilterLabel = null,
  taskDueReferenceIso: _taskDueReferenceIso = "",
  periodLabel: _periodLabel = "",
  onOpenCreate,
  createModalOpen = false,
  dataSource,
}) {
  const subtitle = subtitleProp ?? formatReportPeriodSelectionSubtitle(selection);

  /** @type {string} */
  let bodyLine = "";

  if (loading && summary == null) {
    bodyLine = "Indlæser opgaver…";
  } else if (summary != null && summary.total > 0) {
    bodyLine = `${summary.total} opgaver i porteføljen · ${summary.openCount} åbne · ${summary.overdueCount} overskredet (ref. i dag)`;
    if (assigneeFilterLabel) bodyLine += ` · ${assigneeFilterLabel}`;
    if (summary.highOpen > 0) bodyLine += ` · ${summary.highOpen} høj prio (åbne)`;
  } else if (summary != null && summary.total === 0) {
    bodyLine = "Ingen opgaver i den valgte måned/portefølje";
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Arbejdsliste
        </p>
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">
          Opgaver
        </h1>
        <p
          className={cn(
            "mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted transition-opacity",
            refreshing && "opacity-60",
          )}
        >
          <span className="capitalize">{subtitle}</span>
          {" · Deadline-ref. "}
          <span className="tabular-nums text-fg-quiet">i dag</span>
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
              Ny opgave
            </button>
          : null}
        </div>
        <ReportPeriodPicker selection={selection} onSelectionChange={onSelectionChange} />
      </div>
    </header>
  );
}
