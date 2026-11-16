"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { TaskSubtaskBadge } from "@/components/tasks/task-subtask-badge";
import { routes, taskHref } from "@/config/routes";
import { formatHoursCompactDa, formatIsoDateDa } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import {
  taskDaysUntilDue,
  taskIsDone,
  taskIsOverdue,
  taskIsSubTaskRow,
} from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(200px,2.2fr)_minmax(92px,0.92fr)_minmax(40px,0.38fr)_minmax(70px,0.68fr)_minmax(72px,0.7fr)_minmax(58px,0.55fr)_minmax(80px,0.78fr)_36px]";

/**
 * @typedef {{
 *   id: string;
 *   title: string;
 *   status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
 *   priority: 'low' | 'medium' | 'high';
 *   dueDate: string;
 *   dept?: string;
 *   assigneeId?: string;
 *   assigneeIds?: string[];
 *   estimateHours?: number | null;
 *   isSubTask?: boolean;
 *   parentTaskId?: string;
 *   parentTaskTitle?: string;
 * }} ClientTask
 */

/**
 * @param {{
 *   row: ClientTask;
 *   teamById: Record<string, { id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   showBorder: boolean;
 * }} props
 */
function ClientTaskRow({ row, teamById, showBorder }) {
  const keys =
    Array.isArray(row.assigneeIds) && row.assigneeIds.length ? row.assigneeIds
    : row.assigneeId ? [row.assigneeId]
    : [];
  const assignees = keys.map((id) => teamById[id]).filter(Boolean);
  const primary = assignees[0] ?? null;
  const dept = DEPARTMENTS.find((d) => d.id === row.dept);
  const deptShort =
    typeof dept?.short === "string" ? dept.short
    : dept ? dept.id.slice(0, 4).toUpperCase()
    : "—";
  const done = taskIsDone(row.status);
  const overdue = taskIsOverdue(row);
  const daysLeft = !done ? taskDaysUntilDue(row.dueDate) : null;

  return (
    <Link
      href={taskHref(row)}
      className={cn(
        "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
        GRID,
        showBorder && "border-b border-border-soft",
        taskIsSubTaskRow(row) && "bg-surface-muted/35",
        overdue && "bg-agency-bad-soft/20 shadow-[inset_3px_0_0_var(--agency-bad)] hover:bg-agency-bad-soft/35",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-sans text-[13px] font-medium leading-snug text-fg">{row.title}</div>
          {taskIsSubTaskRow(row) ? <TaskSubtaskBadge compact /> : null}
        </div>
        {taskIsSubTaskRow(row) && row.parentTaskTitle ?
          <div className="mt-0.5 line-clamp-1 font-sans text-[10px] text-fg-quiet">Under {row.parentTaskTitle}</div>
        : null}
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        {assignees.length > 0 ?
          <>
            <div className="flex shrink-0 -space-x-1.5">
              {assignees.slice(0, 3).map((a) => (
                <CrmAvatar
                  key={a.id}
                  label={a.avatar ?? a.name.slice(0, 2)}
                  src={a.image}
                  hue={a.hue ?? 220}
                  className="size-5 text-[9px] ring-2 ring-canvas"
                />
              ))}
            </div>
            <span className="truncate font-sans text-[12px] text-fg-muted">
              {primary?.name}
              {assignees.length > 1 ? ` +${assignees.length - 1}` : ""}
            </span>
          </>
        : <span className="text-fg-quiet">—</span>}
      </div>

      <div className="hidden items-center justify-center sm:flex">
        <span className="text-[10px] font-semibold text-fg-muted">{deptShort}</span>
      </div>

      <div className="flex items-center">
        <TaskPriorityChip priority={row.priority} className="origin-left scale-95" />
      </div>

      <div className="flex items-center">
        <TaskStatusChip status={row.status} className="origin-left scale-95" />
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
            overdue && "font-semibold text-agency-bad",
            !overdue && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && "text-agency-warn",
            done && "text-fg-muted",
          )}
        >
          {formatIsoDateDa(row.dueDate)}
        </span>
        {!done ?
          <span
            className={cn(
              "text-[10px] tabular-nums",
              overdue && "text-agency-bad",
              !overdue && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && "text-agency-warn",
              !overdue && (daysLeft === null || daysLeft > 7) && "text-fg-quiet",
            )}
          >
            {overdue ?
              `${Math.abs(daysLeft ?? 0)} d overskredet`
            : daysLeft === 0 ?
              "I dag"
            : `Om ${daysLeft} d`}
          </span>
        : <span className="text-[10px] text-fg-quiet">Afsluttet</span>}
      </div>

      <PulseIconChevronRight className="justify-self-end text-fg-quiet" />
    </Link>
  );
}

/**
 * @param {{
 *   tasks: ClientTask[];
 *   clientLabel: string;
 *   team?: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 * }} props
 */
export function ClientDetailTasksCard({ tasks, clientLabel, team = [] }) {
  const [showDone, setShowDone] = useState(false);
  const openCount = tasks.filter((t) => !taskIsDone(t.status)).length;

  const teamById = useMemo(() => Object.fromEntries(team.map((m) => [m.id, m])), [team]);

  const sorted = useMemo(() => {
    const visible = showDone ? tasks : tasks.filter((t) => !taskIsDone(t.status));
    return [...visible].sort((a, b) => {
      const ad = taskIsDone(a.status) ? 1 : 0;
      const bd = taskIsDone(b.status) ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    });
  }, [tasks, showDone]);

  return (
    <section className="tally-panel overflow-hidden" aria-label="Opgaver">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h3 className="font-sans text-sm font-semibold text-fg">Opgaver</h3>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {openCount} åbne
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:ml-auto">
          <label className="inline-flex cursor-pointer items-center gap-1.5 font-sans text-[11px] text-fg-muted">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="size-3.5 accent-[var(--agency-brand)]"
            />
            Vis afsluttede
          </label>
          <Link href={routes.tasks} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
            Hele opgavelisten →
          </Link>
        </div>
      </div>

      {sorted.length === 0 ?
        <p className="px-4 py-8 text-center text-[13px] text-fg-muted">Ingen opgaver for {clientLabel}.</p>
      : <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <span>Opgave</span>
              <span>Ansvarlig</span>
              <span className="hidden sm:inline" />
              <span>Prio</span>
              <span>Status</span>
              <span className="text-agency-brand">Est.</span>
              <span>Deadline</span>
              <span />
            </div>
            {sorted.map((t, i) => (
              <ClientTaskRow key={t.id} row={t} teamById={teamById} showBorder={i < sorted.length - 1} />
            ))}
          </div>
        </div>
      }
    </section>
  );
}
