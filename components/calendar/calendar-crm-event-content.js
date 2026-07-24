"use client";

import { CalendarTaskAssigneeAvatars } from "@/components/calendar/calendar-task-assignee-avatars";
import { CALENDAR_CARD_TEXT_COLOR } from "@/lib/crm/calendar-task-assignees";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   title: string;
 *   dueDate: string;
 *   showDue: boolean;
 *   assignees: Array<{ id: string; avatar?: string; name?: string; image?: string; hue?: number }>;
 *   canEdit: boolean;
 *   taskId: string;
 *   slotId: string;
 *   slotIndex?: number;
 *   onRemove: (taskId: string, slotId: string, slotIndex?: number) => void | Promise<void>;
 * }} props
 */
export function CalendarCrmEventContent({
  title,
  dueDate,
  showDue,
  assignees,
  canEdit,
  taskId,
  slotId,
  slotIndex,
  onRemove,
}) {
  return (
    <div className="group/crm-event relative min-w-0 pointer-events-none pr-3 leading-tight" style={{ color: CALENDAR_CARD_TEXT_COLOR }}>
      {canEdit ?
        <button
          type="button"
          title="Fjern fra kalender"
          aria-label="Fjern fra kalender"
          className={cn(
            "calendar-event-remove pointer-events-auto absolute -right-0.5 -top-0.5 z-10 flex size-4 items-center justify-center rounded-sm",
            "bg-canvas/90 text-[11px] leading-none text-fg-muted shadow-sm transition-opacity",
            "opacity-70 hover:bg-agency-bad-soft hover:text-agency-bad hover:opacity-100",
            "group-hover/crm-event:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agency-brand",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onRemove(taskId, slotId, slotIndex);
          }}
        >
          ×
        </button>
      : null}
      <div className="flex min-w-0 items-start gap-1">
        {assignees.length ?
          <CalendarTaskAssigneeAvatars assignees={assignees} size="xs" className="mt-px shrink-0" />
        : null}
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-[11px] font-medium">{title}</div>
          {dueDate ?
            <div className="truncate font-sans text-[9px] font-medium tabular-nums opacity-80">
              {showDue ? `DL ${formatIsoDateDa(dueDate)}` : `Deadline ${formatIsoDateDa(dueDate)}`}
            </div>
          : null}
        </div>
      </div>
    </div>
  );
}
