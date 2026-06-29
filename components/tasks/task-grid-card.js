import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { taskDaysUntilDue, taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";
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
      href={`${routes.tasks}/${encodeURIComponent(row.id)}`}
      className={cn(
        "tally-panel flex flex-col p-3.5 transition-all",
        "hover:border-agency-brand-border md:p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-sans text-[13.5px] font-semibold leading-snug text-fg">{row.title}</div>
          {row.hint ? (
            <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-relaxed text-fg-quiet">{row.hint}</p>
          ) : (
            <p className="mt-1 line-clamp-2 font-sans text-[11px] italic leading-relaxed text-fg-quiet">
              Ingen kort hint — fuld beskrivelse på opgave-siden.
            </p>
          )}
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
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-soft pt-3 text-[11px] text-fg-muted">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Forfaldsdato</div>
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
