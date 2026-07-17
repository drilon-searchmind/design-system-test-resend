import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { taskHref } from "@/config/routes";
import { TaskSubtaskBadge } from "@/components/tasks/task-subtask-badge";
import { formatHoursCompactDa, formatIsoDateDa } from "@/lib/crm/format-da";
import { taskDaysUntilDue, taskIsDone, taskIsOverdue, taskIsSubTaskRow } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   row: {
 *     id: string;
 *     title: string;
 *     hint?: string;
 *     clientId?: string;
 *     clientName: string;
 *     clientLogo: string;
 *     clientHue: number;
 *     assigneeId: string;
 *     dept: string;
 *     status: string;
 *     priority: 'high' | 'medium' | 'low';
 *     dueDate: string;
 *     estimateHours?: number | null;
 *     isSubTask?: boolean;
 *     parentTaskId?: string;
 *     parentTaskTitle?: string;
 *   };
 *   dueReferenceIso: string;
 *   departments?: Array<{ id: string; short?: string }>;
 * }} props
 */
export function TaskGridCard({ row, dueReferenceIso, departments = [] }) {
  const dep = departments.find((d) => d.id === row.dept);
  const overdue = taskIsOverdue(row, dueReferenceIso);
  const daysLeft =
    !taskIsDone(row.status) ? taskDaysUntilDue(row.dueDate, dueReferenceIso) : null;

  const depShort =
    typeof dep?.short === "string" ? dep.short : row.dept ? row.dept.slice(0, 4).toUpperCase() : "—";

  return (
    <Link
      href={taskHref(row)}
      className={cn(
        "tally-panel flex flex-col p-3.5 transition-all",
        "hover:border-agency-brand-border md:p-4",
        taskIsSubTaskRow(row) && "border-dashed",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-sans text-[13.5px] font-semibold leading-snug text-fg">{row.title}</div>
            {taskIsSubTaskRow(row) ? <TaskSubtaskBadge compact /> : null}
          </div>
          {taskIsSubTaskRow(row) && row.parentTaskTitle ?
            <p className="mt-1 font-sans text-[10px] text-fg-quiet">Under {row.parentTaskTitle}</p>
          : null}
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-[12px] font-semibold text-white"
          style={{ background: `oklch(62% 0.14 ${row.clientHue})` }}
        >
          {row.clientLogo}
        </span>
      </div>

      <div className="mt-2 font-sans text-[11px] text-fg-muted">
        <span className="font-medium text-fg-soft">Kunde:</span> {row.clientName}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <TaskStatusChip status={row.status} />
        <TaskPriorityChip priority={row.priority} />
        {typeof row.estimateHours === "number" && Number.isFinite(row.estimateHours) ?
          <span className="inline-flex items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 font-sans text-[10px] font-semibold tabular-nums text-agency-brand">
            Est. {formatHoursCompactDa(row.estimateHours)} t
          </span>
        : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-soft pt-3 text-[11px] text-fg-muted">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Deadline</div>
          <div
            className={cn(
              "mt-0.5 tabular-nums text-fg",
              overdue && "text-agency-bad",
              !overdue &&
                daysLeft !== null &&
                daysLeft <= 7 &&
                daysLeft >= 0 &&
                "text-agency-warn",
            )}
          >
            {formatIsoDateDa(row.dueDate)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Disciplin</div>
          <div className="mt-0.5 text-fg">{depShort}</div>
        </div>
      </div>
    </Link>
  );
}
