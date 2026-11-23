"use client";

import { StickyPageHeader } from "@/components/crm/sticky-page-header";
import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { IconClock } from "@/components/crm/icons";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import { formatReportPeriodSelectionSubtitle } from "@/lib/crm/report-period";
import { TEAM } from "@/lib/crm/static-data";

/** Admin-filter: egne poster (`me`), alle (`all`) eller én medarbejders `key`. */
export const TIME_MEMBER_FILTER_ME = "me";
export const TIME_MEMBER_FILTER_ALL = "all";

/**
 * @param {{
 *   selection: import('@/lib/crm/report-period').ReportPeriodSelection;
 *   onSelectionChange: (selection: import('@/lib/crm/report-period').ReportPeriodSelection) => void;
 *   subtitle?: string;
 *   mineLabel?: string | null;
 *   viewLabel?: string | null;
 *   dataSource?: "demo" | "database";
 *   refreshing?: boolean;
 *   loading?: boolean;
 *   onOpenCreate?: () => void;
 *   createModalOpen?: boolean;
 *   memberFilter?: string;
 *   onMemberFilterChange?: (next: string) => void;
 *   teamMembers?: { key: string; name: string }[] | null;
 * }} props
 */
export function TimePageHeader({
  selection,
  onSelectionChange,
  subtitle: subtitleProp,
  mineLabel = null,
  viewLabel = null,
  dataSource = "demo",
  refreshing = false,
  loading = false,
  onOpenCreate,
  createModalOpen = false,
  memberFilter = TIME_MEMBER_FILTER_ME,
  onMemberFilterChange,
  teamMembers = null,
}) {
  const demoFallbackName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";
  const ownName =
    typeof mineLabel === "string" && mineLabel.trim() ? mineLabel.trim()
    : dataSource === "demo" ?
      demoFallbackName
    : "Dig";
  const viewingOthers = memberFilter !== TIME_MEMBER_FILTER_ME;
  const displayName =
    viewingOthers && typeof viewLabel === "string" && viewLabel.trim() ? viewLabel.trim() : ownName;

  const subtitle = subtitleProp ?? formatReportPeriodSelectionSubtitle(selection);
  const showMemberFilter = typeof onMemberFilterChange === "function" && Array.isArray(teamMembers);

  return (
    <>
      <StickyPageHeader className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
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
            {showMemberFilter ?
              <label className="relative inline-flex items-center">
                <span className="sr-only">Vis registreringer for</span>
                <select
                  value={memberFilter}
                  onChange={(e) => onMemberFilterChange(e.target.value)}
                  className="h-[26px] appearance-none rounded-md border border-border bg-surface-muted py-0 pl-2.5 pr-7 font-sans text-[11px] font-semibold text-fg outline-none transition-colors hover:border-agency-brand-border focus-visible:ring-2 focus-visible:ring-agency-brand"
                >
                  <option value={TIME_MEMBER_FILTER_ME}>Mine ({ownName})</option>
                  <option value={TIME_MEMBER_FILTER_ALL}>Alle</option>
                  {teamMembers.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-quiet">
                  <PulseIconChevronDown size={10} />
                </span>
              </label>
            : null}

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
      </StickyPageHeader>
    </>
  );
}
