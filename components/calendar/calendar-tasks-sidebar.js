"use client";

import { useEffect, useRef } from "react";

import { Draggable } from "@fullcalendar/react/interaction";

import { TaskStatusChip } from "@/components/crm/task-status-chip";
import { CalendarTaskAssigneeAvatars } from "@/components/calendar/calendar-task-assignee-avatars";
import { calendarColorsForTaskStatus } from "@/lib/crm/calendar-task-colors";
import { CALENDAR_CARD_TEXT_COLOR, resolveTaskAssignees } from "@/lib/crm/calendar-task-assignees";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   id: string;
 *   title: string;
 *   clientName: string;
 *   status: string;
 *   dueDate?: string;
 *   estimateHours?: number | null;
 * }} task
 */
function taskDurationAttr(task) {
  const hours =
    typeof task.estimateHours === "number" && Number.isFinite(task.estimateHours) ?
      Math.min(Math.max(task.estimateHours, 0.5), 8)
    : 1;
  return `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`;
}

/**
 * @param {string} iso
 */
function formatSlotWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = formatIsoDateDa(iso.slice(0, 10));
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} · ${hh}:${mm}`;
}

/**
 * @param {{
 *   task: {
 *     id: string;
 *     title: string;
 *     clientName: string;
 *     status: string;
 *     dueDate?: string;
 *     estimateHours?: number | null;
 *     assigneeId?: string;
 *     assigneeIds?: string[];
 *   };
 *   taskDueReferenceIso: string;
 *   teamById: Record<string, { id: string; name?: string; avatar?: string; image?: string; hue?: number }>;
 *   draggable?: boolean;
 * }} props
 */
function DraggableTaskRow({ task, taskDueReferenceIso, teamById, draggable = false }) {
  const colors = calendarColorsForTaskStatus(task.status);
  const assignees = resolveTaskAssignees(task, teamById);
  const done = taskIsDone(task.status);
  const overdue = !done && taskIsOverdue(task, taskDueReferenceIso);

  return (
    <div
      data-task-id={task.id}
      data-title={task.title}
      data-duration={taskDurationAttr(task)}
      className={cn(
        "calendar-unscheduled-item mb-1.5 rounded-md border px-2 py-1.5",
        draggable && !done && "cursor-grab touch-none active:cursor-grabbing",
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: CALENDAR_CARD_TEXT_COLOR,
      }}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <CalendarTaskAssigneeAvatars assignees={assignees} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <span className="min-w-0 flex-1 truncate font-sans text-[11px] font-medium leading-tight">{task.title}</span>
            <TaskStatusChip status={task.status} className="shrink-0 scale-[0.82] origin-right" />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-sans text-[10px] text-fg-muted">
            <span className="truncate">{task.clientName}</span>
            {task.dueDate ?
              <>
                <span>·</span>
                <span className={cn("shrink-0 tabular-nums", overdue && "font-semibold")}>
                  DL {formatIsoDateDa(task.dueDate)}
                </span>
              </>
            : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   dragTasks: Array<{
 *     id: string;
 *     title: string;
 *     clientName: string;
 *     status: string;
 *     dueDate?: string;
 *     estimateHours?: number | null;
 *     assigneeId?: string;
 *     assigneeIds?: string[];
 *   }>;
 *   scheduledSlots: Array<{
 *     task: {
 *       id: string;
 *       title: string;
 *       clientName: string;
 *       status: string;
 *       dueDate?: string;
 *       assigneeId?: string;
 *       assigneeIds?: string[];
 *     };
 *     slot: { id: string; start: string; end: string; index?: number };
 *   }>;
 *   taskDueReferenceIso: string;
 *   teamById: Record<string, { id: string; name?: string; avatar?: string; image?: string; hue?: number }>;
 *   draggable: boolean;
 *   onFocusSlot: (slotId: string, start: string) => void;
 *   onRemoveSlot: (taskId: string, slotId: string, slotIndex?: number) => void | Promise<void>;
 * }} props
 */
export function CalendarTasksSidebar({
  dragTasks,
  scheduledSlots,
  taskDueReferenceIso,
  teamById,
  draggable,
  onFocusSlot,
  onRemoveSlot,
}) {
  const dragRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const draggableInstanceRef = useRef(/** @type {Draggable | null} */ (null));

  useEffect(() => {
    draggableInstanceRef.current?.destroy();
    draggableInstanceRef.current = null;

    if (!draggable || !dragRef.current) return;

    const instance = new Draggable(dragRef.current, {
      itemSelector: ".calendar-unscheduled-item",
      eventData(elNode) {
        const title = elNode.getAttribute("data-title") ?? "Opgave";
        const duration = elNode.getAttribute("data-duration") ?? "01:00";
        return { title, duration };
      },
    });
    draggableInstanceRef.current = instance;

    return () => {
      instance.destroy();
      if (draggableInstanceRef.current === instance) {
        draggableInstanceRef.current = null;
      }
    };
  }, [draggable]);

  return (
    <aside className="tally-panel flex max-h-[720px] flex-col overflow-hidden">
      <div className="border-b border-border px-3 py-2.5">
        <h2 className="font-sans text-[13px] font-semibold text-fg">Opgaver</h2>
        <p className="mt-0.5 font-sans text-[10px] leading-snug text-fg-muted">
          Træk samme opgave ind flere gange. Flyt blokke i kalenderen · hover og klik × for at fjerne.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <section aria-labelledby="calendar-drag-heading">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <h3 id="calendar-drag-heading" className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
              Træk ind i kalender
            </h3>
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] tabular-nums text-fg-quiet">
              {dragTasks.length}
            </span>
          </div>
          <div ref={dragRef}>
            {dragTasks.length === 0 ?
              <p className="px-1 py-3 text-center font-sans text-[11px] text-fg-quiet">Ingen opgaver med valgte filtre.</p>
            : dragTasks.map((task) => (
                <DraggableTaskRow
                  key={task.id}
                  task={task}
                  taskDueReferenceIso={taskDueReferenceIso}
                  teamById={teamById}
                  draggable={draggable}
                />
              ))
            }
          </div>
        </section>

        <section aria-labelledby="calendar-scheduled-heading" className="mt-4 border-t border-border pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <h3 id="calendar-scheduled-heading" className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
              Planlagte
            </h3>
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] tabular-nums text-fg-quiet">
              {scheduledSlots.length}
            </span>
          </div>
          {scheduledSlots.length === 0 ?
            <p className="px-1 py-3 text-center font-sans text-[11px] text-fg-quiet">Ingen planlagte tider endnu.</p>
          : scheduledSlots.map(({ task, slot }) => {
              const colors = calendarColorsForTaskStatus(task.status);
              const assignees = resolveTaskAssignees(task, teamById);
              const canRemove = draggable;
              const slotIndex = typeof slot.index === "number" ? slot.index : undefined;
              return (
                <div key={`${task.id}-${slot.index ?? slot.id}`} className="mb-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onFocusSlot(slot.id, slot.start)}
                    className={cn(
                      "min-w-0 flex-1 rounded-md border px-2 py-1.5 text-left transition-colors",
                      "hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                    )}
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: CALENDAR_CARD_TEXT_COLOR,
                    }}
                  >
                    <div className="flex min-w-0 items-start gap-1.5">
                      <CalendarTaskAssigneeAvatars assignees={assignees} size="sm" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-sans text-[11px] font-medium leading-tight">{task.title}</div>
                        <div className="mt-0.5 font-sans text-[10px] tabular-nums text-fg-muted">{formatSlotWhen(slot.start)}</div>
                      </div>
                    </div>
                  </button>
                  {canRemove ?
                    <button
                      type="button"
                      title="Fjern fra kalender"
                      aria-label={`Fjern ${task.title} fra kalender`}
                      onClick={() => void onRemoveSlot(task.id, slot.id, slotIndex)}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-canvas",
                        "text-sm leading-none text-fg-muted transition-colors",
                        "hover:border-agency-bad-border hover:bg-agency-bad-soft hover:text-agency-bad",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                      )}
                    >
                      ×
                    </button>
                  : null}
                </div>
              );
            })
          }
        </section>
      </div>
    </aside>
  );
}
