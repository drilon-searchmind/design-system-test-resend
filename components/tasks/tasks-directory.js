"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TaskGridCard } from "@/components/tasks/task-grid-card";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { routes } from "@/config/routes";
import { formatHoursCompactDa, formatIsoDateDa } from "@/lib/crm/format-da";
import {
  taskDaysUntilDue,
  taskIsDone,
  taskIsOverdue,
  taskPriorityRank,
} from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(200px,2.2fr)_minmax(120px,1fr)_minmax(92px,0.92fr)_minmax(40px,0.38fr)_minmax(70px,0.68fr)_minmax(72px,0.7fr)_minmax(58px,0.55fr)_minmax(80px,0.78fr)_36px]";

/**
 * @param {{
 *   tasks: Array<{
 *     id: string;
 *     title: string;
 *     hint?: string;
 *     clientName: string;
 *     clientLogo: string;
 *     clientHue: number;
 *     assigneeId: string;
 *     dept: string;
 *     status: string;
 *     priority: string;
 *     dueDate: string;
 *     estimateHours?: number | null;
 *   }>;
 *   departments: Array<{ id: string; name?: string; short?: string }>;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number }>;
 *   taskDueReferenceIso: string;
 *   mineAssigneeKey: string;
 *   headingId?: string;
 *   toolbarTitle?: string;
 * }} props
 */
export function TasksDirectory({
  tasks,
  departments,
  team,
  taskDueReferenceIso,
  mineAssigneeKey,
  headingId = "tasks-directory-heading",
  toolbarTitle = "Alle opgaver",
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("due");
  const [density, setDensity] = useState("list");

  const deptById = useMemo(() => {
    /** @type {Record<string, (typeof departments)[number]>} */
    const m = {};
    for (const d of departments) {
      m[d.id] = d;
    }
    return m;
  }, [departments]);

  const teamById = useMemo(() => {
    /** @type {Record<string, (typeof team)[number]>} */
    const m = {};
    for (const t of team) {
      m[t.id] = t;
    }
    return m;
  }, [team]);

  const openCount = useMemo(() => tasks.filter((t) => !taskIsDone(t.status)).length, [tasks]);
  const overdueCount = useMemo(
    () => tasks.filter((t) => taskIsOverdue(t, taskDueReferenceIso)).length,
    [tasks, taskDueReferenceIso],
  );
  const mineCount = useMemo(
    () => (mineAssigneeKey ? tasks.filter((t) => t.assigneeId === mineAssigneeKey).length : 0),
    [tasks, mineAssigneeKey],
  );

  const filtered = useMemo(() => {
    const list = tasks.filter((t) => {
      const ql = q.trim().toLowerCase();
      if (
        ql &&
        !t.title.toLowerCase().includes(ql) &&
        !(t.hint?.toLowerCase().includes(ql)) &&
        !t.clientName.toLowerCase().includes(ql)
      ) {
        return false;
      }
      if (filter === "open" && taskIsDone(t.status)) return false;
      if (filter === "mine" && (!mineAssigneeKey || t.assigneeId !== mineAssigneeKey)) return false;
      if (filter === "overdue" && !taskIsOverdue(t, taskDueReferenceIso)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "due") {
        const ad = a.dueDate ? a.dueDate : "9999-12-31";
        const bd = b.dueDate ? b.dueDate : "9999-12-31";
        return ad.localeCompare(bd);
      }
      if (sort === "prio")
        return taskPriorityRank(/** @type {'high'|'medium'|'low'} */ (a.priority)) -
          taskPriorityRank(/** @type {'high'|'medium'|'low'} */ (b.priority));
      if (sort === "title") return a.title.localeCompare(b.title, "da");
      return 0;
    });

    return list;
  }, [q, filter, sort, tasks, taskDueReferenceIso, mineAssigneeKey]);

  return (
    <section
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h3 id={headingId} className="font-sans text-sm font-semibold text-fg">
          {toolbarTitle}
        </h3>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {tasks.length}
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
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <PulseSegmentedControl
            size="sm"
            active={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "open", label: "Åbne", count: openCount },
              ...(mineAssigneeKey ? [{ id: "mine", label: "Mine", count: mineCount }] : []),
              { id: "overdue", label: "Overskredet", count: overdueCount },
            ]}
          />

          <PulseSegmentedControl
            size="sm"
            active={density}
            onChange={setDensity}
            tabs={[
              { id: "list", label: "", icon: () => <PulseIconList size={12} /> },
              { id: "cards", label: "", icon: () => <PulseIconGrid size={12} /> },
            ]}
          />
        </div>
      </div>

      {density === "cards" ?
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:p-4">
          {filtered.map((row) => (
            <TaskGridCard key={row.id} row={row} dueReferenceIso={taskDueReferenceIso} departments={departments} />
          ))}
        </div>
      : <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("title")}
              >
                Opgave {sort === "title" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Kunde</span>
              <span>Ansvarlig</span>
              <span className="hidden sm:inline" />
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("prio")}
              >
                Prio {sort === "prio" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Status</span>
              <span className="text-agency-brand">Est.</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("due")}
              >
                Deadline {sort === "due" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span />
            </div>

            {filtered.map((row, i) => {
              const assignee = row.assigneeId ? teamById[row.assigneeId] : null;
              const dep = deptById[row.dept];
              const overdue = taskIsOverdue(row, taskDueReferenceIso);
              const daysLeft = !taskIsDone(row.status)
                ? taskDaysUntilDue(row.dueDate, taskDueReferenceIso)
                : null;

              const depShort =
                typeof dep?.short === "string" ?
                  dep.short
                : typeof dep?.id === "string" ?
                  dep.id.slice(0, 4).toUpperCase()
                : "—";

              return (
                <Link
                  key={row.id}
                  href={`${routes.tasks}/${encodeURIComponent(row.id)}`}
                  className={cn(
                    "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    GRID,
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-sans text-[13px] font-medium leading-snug text-fg">{row.title}</div>
                    {row.hint ?
                      <div className="mt-0.5 line-clamp-1 font-sans text-[11px] text-fg-quiet">{row.hint}</div>
                    : null}
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-border text-[10.5px] font-semibold text-white"
                      style={{ background: `oklch(62% 0.14 ${row.clientHue})` }}
                    >
                      {row.clientLogo}
                    </span>
                    <span className="truncate font-sans text-[12px] text-fg-muted">{row.clientName}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    {assignee ?
                      <>
                        <CrmAvatar
                          label={assignee.avatar ?? assignee.name.slice(0, 2)}
                          src={assignee.image}
                          hue={assignee.hue ?? 220}
                          className="size-5 text-[9px]"
                        />
                        <span className="truncate font-sans text-[12px] text-fg-muted">{assignee.name}</span>
                      </>
                    : <span className="text-fg-quiet">—</span>}
                  </div>

                  <div className="hidden items-center justify-center sm:flex">
                    <span className="text-[10px] font-semibold text-fg-muted">{depShort}</span>
                  </div>

                  <div className="flex items-center">
                    <TaskPriorityChip priority={/** @type {'high'|'medium'|'low'} */ (row.priority)} className="scale-95 origin-left" />
                  </div>

                  <div className="flex items-center">
                    <TaskStatusChip status={row.status} className="scale-95 origin-left" />
                  </div>

                  <div className="flex items-center">
                    {typeof row.estimateHours === "number" && Number.isFinite(row.estimateHours) ?
                      <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-1.5 py-0.5 font-sans text-[11px] font-semibold tabular-nums text-agency-brand">
                        {formatHoursCompactDa(row.estimateHours)}t
                      </span>
                    : <span className="text-[12px] text-fg-quiet">—</span>}
                  </div>

                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[12px] tabular-nums text-fg",
                        overdue && "text-agency-bad",
                        !overdue && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && "text-agency-warn",
                        taskIsDone(row.status) && "text-fg-muted",
                      )}
                    >
                      {formatIsoDateDa(row.dueDate)}
                    </span>
                    {!taskIsDone(row.status) ?
                      <span
                        className={cn(
                          "text-[10px] tabular-nums",
                          overdue && "text-agency-bad",
                          !overdue && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && "text-agency-warn",
                          !overdue && (daysLeft === null || daysLeft > 7) && "text-fg-quiet",
                        )}
                      >
                        {overdue ?
                          `${Math.abs(taskDaysUntilDue(row.dueDate, taskDueReferenceIso))} d overskredet`
                        : daysLeft === 0 ?
                          "I dag"
                        : `Om ${daysLeft} d`}
                      </span>
                    : <span className="text-[10px] text-fg-quiet">Afsluttet</span>}
                  </div>

                  <PulseIconChevronRight className="justify-self-end text-fg-quiet" />
                </Link>
              );
            })}
          </div>
        </div>
      }
    </section>
  );
}
