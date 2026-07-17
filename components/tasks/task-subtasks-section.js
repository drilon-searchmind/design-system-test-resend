"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { TasksCreateForm } from "@/components/tasks/tasks-create-form";
import { TaskSubtaskBadge } from "@/components/tasks/task-subtask-badge";
import { taskHref } from "@/config/routes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const SUBTASK_GRID =
  "grid-cols-[minmax(180px,1fr)_minmax(96px,0.9fr)_minmax(96px,0.9fr)_minmax(88px,0.75fr)_28px]";

/**
 * @param {{
 *   parentTaskId: string;
 *   parentTaskTitle: string;
 *   subTasks: Array<{
 *     id: string;
 *     title: string;
 *     hint?: string;
 *     status: string;
 *     priority: 'high' | 'medium' | 'low';
 *     dueDate?: string;
 *     isSubTask?: boolean;
 *     parentTaskId?: string;
 *   }>;
 *   departments: Array<{ id: string; name: string }>;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   clientsPicklist: Array<{ value: string; label: string }>;
 *   taskTemplatesForCreate?: Array<Record<string, unknown>>;
 *   onCreated?: () => void;
 *   readOnly?: boolean;
 * }} props
 */
export function TaskSubtasksSection({
  parentTaskId,
  parentTaskTitle,
  subTasks,
  departments,
  team,
  clientsPicklist,
  taskTemplatesForCreate = [],
  onCreated,
  readOnly = false,
}) {
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const handleCreate = useCallback(
    async (body) => {
      setSubmitting(true);
      setError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/tasks?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, parentTaskId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette delopgave");
        setCreating(false);
        onCreated?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fejl");
      } finally {
        setSubmitting(false);
      }
    },
    [onCreated, parentTaskId],
  );

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="task-subtasks-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="task-subtasks-heading" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Sub opgaver ({subTasks.length})
          </h2>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            Delopgaver arver kunde og prioritet fra «{parentTaskTitle}».
          </p>
        </div>
        {!creating && !readOnly ?
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-8 items-center rounded-md border border-border bg-surface-muted px-3 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand"
          >
            + Opret delopgave
          </button>
        : null}
      </div>

      {creating ?
        <div className="mt-4 border-t border-border-soft pt-4">
          <TasksCreateForm
            variant="card"
            departments={departments}
            team={team}
            clientsPicklist={clientsPicklist}
            taskTemplatesForCreate={taskTemplatesForCreate}
            submitting={submitting}
            error={error}
            parentTaskId={parentTaskId}
            onSubmit={handleCreate}
            onCancel={() => {
              setCreating(false);
              setError(null);
            }}
          />
        </div>
      : null}

      {subTasks.length ?
        <div className="mt-4 w-full overflow-x-auto rounded-xl border border-border bg-canvas">
          <div
            className={cn(
              "grid min-w-[36rem] gap-3 border-b border-border-soft px-3 py-2 md:px-4",
              SUBTASK_GRID,
            )}
          >
            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] text-fg-soft">Titel</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] text-fg-soft">Status</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] text-fg-soft">Prioritet</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.07em] text-fg-soft">Deadline</span>
            <span className="sr-only">Åbn</span>
          </div>
          <ul className="min-w-[36rem]">
            {subTasks.map((sub, index) => (
              <li key={sub.id}>
                <Link
                  href={taskHref(sub)}
                  className={cn(
                    "grid w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-3",
                    SUBTASK_GRID,
                    index < subTasks.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-sans text-[13px] font-medium text-fg">{sub.title}</span>
                    <TaskSubtaskBadge compact />
                  </div>
                  <div className="flex items-center">
                    <TaskStatusChip status={sub.status} className="origin-left scale-95" />
                  </div>
                  <div className="flex items-center">
                    <TaskPriorityChip priority={sub.priority} className="origin-left scale-95" />
                  </div>
                  <span className="font-sans text-[12px] tabular-nums text-fg-muted">
                    {sub.dueDate ? formatIsoDateDa(sub.dueDate) : "—"}
                  </span>
                  <PulseIconChevronRight className="justify-self-end text-fg-quiet" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      : !creating ?
        <p className="mt-4 font-sans text-[12px] text-fg-quiet">Ingen delopgaver endnu.</p>
      : null}
    </section>
  );
}
