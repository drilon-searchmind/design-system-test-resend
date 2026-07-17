"use client";

import { IconUsers } from "@/components/crm/icons";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { TEAM } from "@/lib/crm/static-data";
import { formatReportPeriodSelectionSubtitle } from "@/lib/crm/report-period";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";

/**
 * @param {{
 *   selection: import('@/lib/crm/report-period').ReportPeriodSelection;
 *   onSelectionChange: (selection: import('@/lib/crm/report-period').ReportPeriodSelection) => void;
 *   subtitle?: string;
 *   dataSource?: "demo" | "database";
 *   mineLabel?: string | null;
 *   refreshing?: boolean;
 *   loading?: boolean;
 * }} props
 */
export function TeamPageHeader({
  selection,
  onSelectionChange,
  subtitle: subtitleProp,
  dataSource = "demo",
  mineLabel = null,
  refreshing = false,
  loading = false,
}) {
  const demoFallbackName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";
  const displayName =
    typeof mineLabel === "string" && mineLabel.trim() ?
      mineLabel.trim()
    : dataSource === "demo" ?
      demoFallbackName
    : "Dig";

  const subtitle = subtitleProp ?? formatReportPeriodSelectionSubtitle(selection);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconUsers size={14} className="text-agency-brand" aria-hidden />
            Roster & discipliner
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">Team</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            <span className="capitalize">{subtitle}</span>
            {" — "}
            Bureauhold med disciplin, kontrakteret tid og belægning fra åbne opgaver (samme logik som Belægning).
            {refreshing ?
              <span className="text-[11px] text-fg-quiet"> · Opdaterer…</span>
            : null}
            {" "}
            Din række markeres som{" "}
            <span className="font-semibold text-fg">{loading ? "\u2026" : displayName}</span>.
          </p>
        </div>

        <ReportPeriodPicker selection={selection} onSelectionChange={onSelectionChange} />
      </header>
    </div>
  );
}
