import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { taskDaysUntilDue, taskIsDone } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   tasks: Array<{
 *     id: string;
 *     title: string;
 *     status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
 *     priority: 'low' | 'medium' | 'high';
 *     dueDate: string;
 *   }>;
 *   clientLabel: string;
 * }} props
 */
export function ClientDetailTasksCard({ tasks, clientLabel }) {
  const sorted = [...tasks].sort((a, b) => {
    const ad = taskIsDone(a.status) ? 1 : 0;
    const bd = taskIsDone(b.status) ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Åbne & kommende opgaver
        </h2>
        <Link href={routes.tasks} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Hele opgavelisten →
        </Link>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {sorted.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-6 text-[13px] text-fg-muted">
            Ingen opgaver for {clientLabel}.
          </li>
        ) : (
          sorted.map((t) => {
            const days = !taskIsDone(t.status) ? taskDaysUntilDue(t.dueDate) : null;
            return (
              <li
                key={t.id}
                className="rounded-xl border border-border-soft bg-surface-muted/30 px-3 py-2.5 transition-colors hover:border-agency-brand-border/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${routes.tasks}/${t.id}`}
                    className="min-w-[55%] flex-1 font-sans text-[13px] font-medium leading-snug text-fg hover:text-agency-brand hover:underline"
                  >
                    {t.title}
                  </Link>
                  <TaskStatusChip status={t.status} />
                  <TaskPriorityChip priority={t.priority} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-fg-muted">
                  <span className="tabular-nums">{formatIsoDateDa(t.dueDate)}</span>
                  {days !== null ? (
                    <span
                      className={cn(
                        days < 0 && "text-agency-bad",
                        days <= 7 && days >= 0 && "text-agency-warn",
                        days > 7 && "text-fg-quiet",
                      )}
                    >
                      ·{" "}
                      {days < 0 ? `${Math.abs(days)} d overskredet` : days === 0 ? "I dag" : `Om ${days} d`}
                    </span>
                  ) : (
                    <span className="text-fg-quiet">· Afsluttet</span>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
