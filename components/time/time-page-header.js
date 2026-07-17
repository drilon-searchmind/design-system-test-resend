"use client";

import { useTimerModal } from "@/components/crm/timer-modal-context";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { IconClock } from "@/components/crm/icons";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import { formatReportPeriodSelectionSubtitle } from "@/lib/crm/report-period";
import { TEAM } from "@/lib/crm/static-data";

/**
 * @param {{
 *   selection: import('@/lib/crm/report-period').ReportPeriodSelection;
 *   onSelectionChange: (selection: import('@/lib/crm/report-period').ReportPeriodSelection) => void;
 *   subtitle?: string;
 *   mineLabel?: string | null;
 *   dataSource?: "demo" | "database";
 *   refreshing?: boolean;
 *   loading?: boolean;
 *   onOpenCreate?: () => void;
 *   createModalOpen?: boolean;
 * }} props
 */
export function TimePageHeader({
  selection,
  onSelectionChange,
  subtitle: subtitleProp,
  mineLabel = null,
  dataSource = "demo",
  refreshing = false,
  loading = false,
  onOpenCreate,
  createModalOpen = false,
}) {
  const { openTimer, open: timerModalOpen } = useTimerModal();
  const demoFallbackName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";
  const displayName =
    typeof mineLabel === "string" && mineLabel.trim() ? mineLabel.trim()
    : dataSource === "demo" ?
      demoFallbackName
    : "Dig";

  const subtitle = subtitleProp ?? formatReportPeriodSelectionSubtitle(selection);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconClock size={14} className="text-agency-brand" aria-hidden />
            Arbejdstid
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">
            Tidsregistrering
          </h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            <span className="capitalize">{subtitle}</span>
            {refreshing ?
              <span className="text-[11px] text-fg-quiet"> · Opdaterer…</span>
            : null}
            {" "}
            Navn: <span className="font-semibold text-fg">{loading ? "\u2026" : displayName}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openTimer}
              aria-haspopup="dialog"
              aria-expanded={timerModalOpen}
              className="inline-flex h-[26px] items-center rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[11px] font-semibold text-white transition-colors hover:bg-agency-brand/90"
            >
              Timer
            </button>

            {typeof onOpenCreate === "function" ?
              <button
                type="button"
                onClick={onOpenCreate}
                aria-haspopup="dialog"
                aria-expanded={createModalOpen}
                className="inline-flex h-[26px] items-center rounded-md border border-border bg-surface-muted px-3 font-sans text-[11px] font-semibold text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand"
              >
                Ny registrering
              </button>
            : null}

            <ReportPeriodPicker selection={selection} onSelectionChange={onSelectionChange} />
          </div>
        </div>
      </header>
    </div>
  );
}
