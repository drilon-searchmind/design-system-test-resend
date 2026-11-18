"use client";

import { TaskDetailActivityCard } from "@/components/tasks/task-detail-activity-card";
import { TaskDetailCommentsSection } from "@/components/tasks/task-detail-comments-section";
import { TaskDetailInlineDescription } from "@/components/tasks/task-detail-inline-fields";
import { TaskDetailProperties } from "@/components/tasks/task-detail-properties";
import { TaskDetailTimeTodayCard } from "@/components/tasks/task-detail-time-today-card";
import { TaskSubtasksSection } from "@/components/tasks/task-subtasks-section";
import { cn } from "@/lib/utils";

/** @typedef {import('@/components/tasks/use-task-field-save').TaskFieldStatus} TaskFieldStatus */

/**
 * Single-view task detail: fields, description, sub-tasks, time, activity + comments sidebar.
 * @param {{
 *   task: {
 *     id: string;
 *     status: string;
 *     dueDate: string;
 *     priority: string;
 *     dept: string;
 *     clientId: string;
 *     clientName: string;
 *     billable: boolean;
 *     estimateHours: number | null;
 *     assigneeIds: string[];
 *     isSubTask: boolean;
 *     description: string;
 *   };
 *   mode: "demo" | "database";
 *   readOnly: boolean;
 *   readOnlyHint?: string;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   departments: Array<Record<string, unknown>>;
 *   clientsPicklist: Array<{ value: string; label: string; group?: string }>;
 *   activityEntries: Array<{ id: string; at: string; kind: string; body?: string; summary?: string; actorId?: string }>;
 *   timeEntries: Array<{ id: string; at: string; dur: number; desc: string; dept?: string | null; memberKey?: string; memberName?: string }>;
 *   dueReferenceIso: string;
 *   highlightCommentId?: string;
 *   subTasks?: Array<Record<string, unknown>>;
 *   subTaskCreateContext?: {
 *     parentTaskId: string;
 *     parentTaskTitle: string;
 *     departments: Array<{ id: string; name: string }>;
 *     team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *     clientsPicklist: Array<{ value: string; label: string }>;
 *     onSubTaskCreated?: () => void;
 *     readOnly?: boolean;
 *   } | null;
 *   fieldStatus: Record<string, TaskFieldStatus>;
 *   onFieldSave: (field: string, patch: Record<string, unknown>, optimistic: Record<string, unknown>) => Promise<boolean>;
 *   onDelete?: () => void;
 *   deleting?: boolean;
 * }} props
 */
export function TaskDetailOverview({
  task,
  mode,
  readOnly,
  readOnlyHint = "",
  team,
  departments,
  clientsPicklist,
  activityEntries,
  timeEntries,
  dueReferenceIso,
  highlightCommentId = "",
  subTasks = [],
  subTaskCreateContext = null,
  fieldStatus,
  onFieldSave,
  onDelete,
  deleting = false,
}) {
  const loggedMinutes = timeEntries.reduce((s, e) => s + (Number(e.dur) || 0), 0);
  const departmentOptions = departments.map((d) => ({
    id: String(d.id),
    name: typeof d.name === "string" && d.name.trim() ? d.name : String(d.id),
  }));

  return (
    <div className="grid gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,38%)] lg:gap-x-10 lg:items-start">
      <div className={cn("flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]")}>
        {readOnly && readOnlyHint ?
          <p className="font-sans text-[12px] text-fg-quiet">{readOnlyHint}</p>
        : null}

        <TaskDetailProperties
          task={task}
          team={team}
          departments={departmentOptions}
          clientsPicklist={clientsPicklist}
          loggedMinutes={loggedMinutes}
          dueReferenceIso={dueReferenceIso}
          readOnly={readOnly}
          fieldStatus={fieldStatus}
          onSave={onFieldSave}
        />

        <TaskDetailInlineDescription
          html={task.description}
          readOnly={readOnly}
          status={fieldStatus.description}
          onSave={(next) => onFieldSave("description", { description: next }, { description: next })}
        />

        {subTaskCreateContext ?
          <TaskSubtasksSection
            parentTaskId={subTaskCreateContext.parentTaskId}
            parentTaskTitle={subTaskCreateContext.parentTaskTitle}
            subTasks={
              /** @type {Array<{ id: string; title: string; hint?: string; status: string; priority: 'high' | 'medium' | 'low'; dueDate?: string; isSubTask?: boolean; parentTaskId?: string }>} */ (
                subTasks
              )
            }
            departments={subTaskCreateContext.departments}
            team={subTaskCreateContext.team}
            clientsPicklist={subTaskCreateContext.clientsPicklist}
            onCreated={subTaskCreateContext.onSubTaskCreated}
            readOnly={subTaskCreateContext.readOnly === true}
          />
        : null}

        <TaskDetailTimeTodayCard
          taskId={task.id}
          entries={timeEntries}
          departments={departments}
          sourceHint="Alle registrerede timer på opgaven — med hvem der har logget."
        />

        <TaskDetailActivityCard entries={activityEntries} />

        {onDelete && !readOnly ?
          <div className="flex justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className={cn(
                "h-8 rounded-md border border-agency-bad-border bg-agency-bad-soft px-3",
                "font-sans text-[12px] font-medium text-agency-bad hover:opacity-90 disabled:opacity-40",
              )}
            >
              {deleting ? "Sletter…" : "Slet opgave"}
            </button>
          </div>
        : null}
      </div>

      <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <TaskDetailCommentsSection
          taskId={task.id}
          mode={mode}
          team={team}
          highlightCommentId={highlightCommentId}
          layout="sidebar"
          showHeading
        />
      </aside>
    </div>
  );
}
