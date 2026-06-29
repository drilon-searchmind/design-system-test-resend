import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { taskIsOverdue } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * Åbne opgaver på medarbejder — demo (`TASKS`) eller API (`tasksOpen` normaliseret til rækker med id/dueDate).
 * @param {{
 *   tasks: Array<{
 *     id?: string;
 *     key?: string;
 *     title: string;
 *     hint?: string;
 *     status: string;
 *     priority: string;
 *     dueDate?: string;
 *     clientName?: string;
 *   }>;
 *   dueRefIso?: string;
 * }} props
 */
export function TeamMemberOpenTasksCard({ tasks, dueRefIso }) {
  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-sans text-sm font-semibold text-fg">Åbne opgaver på dig</h2>
        <span className="text-[10px] uppercase tracking-[0.06em] text-fg-soft">{tasks.length} stk.</span>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border-soft bg-surface-muted/35 px-3 py-5 text-center font-sans text-[12px] text-fg-muted">
          Ingen åbne opgaver på board — god fordybelse.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border-soft">
          {tasks.map((t) => {
            const taskId = typeof t.id === "string" && t.id ? t.id : typeof t.key === "string" ? t.key : t.title;
            const dueForOverdue =
              typeof t.dueDate === "string" && t.dueDate ?
                t.dueDate.slice(0, 10)
              : "";
            const overdue = taskIsOverdue(
              { status: t.status, dueDate: dueForOverdue },
              dueRefIso ?? undefined,
            );
            return (
              <li key={taskId}>
                <Link
                  href={`${routes.tasks}/${encodeURIComponent(taskId)}`}
                  className={cn(
                    "flex flex-col gap-2 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-surface-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-sans text-[13px] font-medium text-fg">{t.title}</span>
                    {t.hint ? <div className="mt-0.5 font-sans text-[11px] text-fg-quiet">{t.hint}</div> : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <TaskStatusChip status={t.status} />
                      <TaskPriorityChip priority={t.priority} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                    <span className="truncate text-[11px] text-fg-muted">{t.clientName}</span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        overdue ? "font-semibold text-agency-bad" : "text-fg-quiet",
                      )}
                    >
                      Forf. {dueForOverdue ? formatIsoDateDa(dueForOverdue) : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 border-t border-border-soft pt-3 text-center font-sans text-[11px] text-fg-muted">
        <Link href={routes.tasks} className="font-medium text-agency-brand hover:underline">
          Gå til hele boardet →
        </Link>
      </div>
    </section>
  );
}
