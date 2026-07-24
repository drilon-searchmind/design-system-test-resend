"use client";

import { TasksAssigneeFilter } from "@/components/tasks/tasks-assignee-filter";
import { PulseIconSearch } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   taskCount: number;
 *   totalCount: number;
 *   q: string;
 *   onQChange: (v: string) => void;
 *   scopeFilter: 'all' | 'open' | 'overdue';
 *   onScopeFilterChange: (v: 'all' | 'open' | 'overdue') => void;
 *   sort: string;
 *   onSortChange: (v: string) => void;
 *   openCount: number;
 *   overdueCount: number;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   mineAssigneeKey: string;
 *   selectedAssignees: Set<string>;
 *   onSelectedAssigneesChange: (next: Set<string>) => void;
 *   tasks: Array<{ assigneeId?: string; assigneeIds?: string[] }>;
 * }} props
 */
export function CalendarFiltersBar({
  taskCount,
  totalCount,
  q,
  onQChange,
  scopeFilter,
  onScopeFilterChange,
  sort,
  onSortChange,
  openCount,
  overdueCount,
  team,
  mineAssigneeKey,
  selectedAssignees,
  onSelectedAssigneesChange,
  tasks,
}) {
  const hasUnassignedTasks = tasks.some((t) => {
    const ids =
      Array.isArray(t.assigneeIds) && t.assigneeIds.length ?
        t.assigneeIds
      : t.assigneeId?.trim() ?
        [t.assigneeId.trim()]
      : [];
    return ids.length === 0;
  });

  return (
    <section className="tally-panel overflow-hidden" aria-label="Filtrer opgaver">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h2 className="font-sans text-sm font-semibold text-fg">Opgaver i kalender</h2>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {taskCount} af {totalCount}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg opgave eller kunde…"
              value={q}
              onChange={(e) => onQChange(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <TasksAssigneeFilter
              team={team}
              mineAssigneeKey={mineAssigneeKey}
              selected={selectedAssignees}
              onChange={onSelectedAssigneesChange}
              hasUnassignedTasks={hasUnassignedTasks}
            />

            <PulseSegmentedControl
              size="sm"
              active={scopeFilter}
              onChange={(id) => onScopeFilterChange(/** @type {'all' | 'open' | 'overdue'} */ (id))}
              tabs={[
                { id: "all", label: "Alle status" },
                { id: "open", label: "Åbne", count: openCount },
                { id: "overdue", label: "Overskredet", count: overdueCount },
              ]}
            />
          </div>

          <label className="flex items-center gap-2 font-sans text-[12px] text-fg-muted">
            <span className="text-fg-soft">Sortér</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-muted px-2 text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
            >
              <option value="due">Deadline</option>
              <option value="prio">Prioritet</option>
              <option value="title">Titel</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
