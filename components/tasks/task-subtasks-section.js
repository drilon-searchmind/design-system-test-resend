"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { TasksCreateForm } from "@/components/tasks/tasks-create-form";
import { taskHref } from "@/config/routes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const ADD_BUTTON_CLASS =
  "inline-flex h-7 items-center rounded-md border border-dashed border-border px-2.5 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand";

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

  const hasSubTasks = subTasks.length > 0;

  if (!hasSubTasks && !creating) {
    if (readOnly) return null;
    return (
      <div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          title={`Delopgaver arver kunde og prioritet fra «${parentTaskTitle}».`}
          className={ADD_BUTTON_CLASS}
        >
          + Delopgave
        </button>
      </div>
    );
  }

  return (
    <section className="tally-panel p-3 md:p-4" aria-labelledby="task-subtasks-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="task-subtasks-heading" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          {hasSubTasks ? `Delopgaver · ${subTasks.length}` : "Ny delopgave"}
        </h2>
        {!creating && !readOnly ?
          <button type="button" onClick={() => setCreating(true)} className={ADD_BUTTON_CLASS}>
            + Delopgave
          </button>
        : null}
      </div>

      {creating ?
        <div className="mt-3 border-t border-border-soft pt-3">
          <p className="mb-3 font-sans text-[12px] text-fg-muted">
            Delopgaver arver kunde og prioritet fra «{parentTaskTitle}».
          </p>
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

      {hasSubTasks ?
        <ul className="mt-2 flex flex-col">
          {subTasks.map((sub, index) => (
            <li key={sub.id}>
              <Link
                href={taskHref(sub)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-muted",
                  index < subTasks.length - 1 && "border-b border-border-soft",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium text-fg">{sub.title}</span>
                <TaskStatusChip status={sub.status} className="shrink-0 scale-95" />
                <span className="w-[72px] shrink-0 text-right font-sans text-[12px] tabular-nums text-fg-muted">
                  {sub.dueDate ? formatIsoDateDa(sub.dueDate) : "—"}
                </span>
                <PulseIconChevronRight className="shrink-0 text-fg-quiet" />
              </Link>
            </li>
          ))}
        </ul>
      : null}
    </section>
  );
}
