"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import Calendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin, { Draggable } from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import daLocale from "@fullcalendar/react/locales/da";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

import { toLocalIsoDateTime } from "@/lib/crm/calendar-task-schedule";
import { CALENDAR_CARD_TEXT_COLOR } from "@/lib/crm/calendar-task-assignees";
import { CalendarCrmEventContent } from "@/components/calendar/calendar-crm-event-content";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

/**
 * @param {Date | string | null | undefined} value
 */
function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

/**
 * @param {string} iso
 */
function dateKeyFromIso(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * @param {import('@fullcalendar/core').EventMountArg} info
 */
function applyEventColors(info) {
  const props = info.event.extendedProps ?? {};
  const bg = typeof props.colorBg === "string" ? props.colorBg : "";
  const border = typeof props.colorBorder === "string" ? props.colorBorder : "";
  if (!bg) return;
  info.el.style.setProperty("background-color", bg, "important");
  info.el.style.setProperty("border-color", border || bg, "important");
  info.el.style.setProperty("color", CALENDAR_CARD_TEXT_COLOR, "important");
}

/**
 * @param {{
 *   viewMode: 'week' | 'month';
 *   onViewModeChange: (mode: 'week' | 'month') => void;
 *   events: Array<Record<string, unknown>>;
 *   editable: boolean;
 *   highlightedSlotId?: string | null;
 *   onRangeChange: (range: { start: string; end: string }) => void;
 *   onTaskClick: (taskId: string, parentTaskId?: string) => void;
 *   onGoogleClick: (htmlLink: string) => void;
 *   onScheduleCreate: (taskId: string, start: string, end: string) => Promise<void>;
 *   onScheduleUpdate: (taskId: string, slotId: string, start: string, end: string, slotIndex?: number) => Promise<void>;
 *   onScheduleDelete: (taskId: string, slotId: string, slotIndex?: number) => Promise<void>;
 * }} props
 * @param {import('react').Ref<{ focusSlot: (slotId: string, start: Date | string) => void }>} ref
 */
export const CalendarFullCalendar = forwardRef(function CalendarFullCalendar(
  {
    viewMode,
    onViewModeChange,
    events,
    editable,
    highlightedSlotId = null,
    onRangeChange,
    onTaskClick,
    onGoogleClick,
    onScheduleCreate,
    onScheduleUpdate,
    onScheduleDelete,
  },
  ref,
) {
  const calendarRef = useRef(/** @type {import('@fullcalendar/react').CalendarRef | null} */ (null));
  const receiveInFlightRef = useRef(/** @type {Set<string>} */ (new Set()));

  const fcEvents = useMemo(
    () =>
      events.map((ev) => ({
        ...ev,
        start: ev.start instanceof Date ? toLocalIsoDateTime(ev.start) : ev.start,
        end: ev.end instanceof Date ? toLocalIsoDateTime(ev.end) : ev.end,
      })),
    [events],
  );

  const focusSlot = useCallback((_slotId, start) => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    const date = start instanceof Date ? start : new Date(String(start));
    if (Number.isNaN(date.getTime())) return;

    api.gotoDate(date);
    if (typeof api.scrollToTime === "function" && !Number.isNaN(date.getHours())) {
      api.scrollToTime(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`);
    }
  }, []);

  useImperativeHandle(ref, () => ({ focusSlot }), [focusSlot]);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.changeView(viewMode === "month" ? "dayGridMonth" : "timeGridWeek");
  }, [viewMode]);

  const handleDatesSet = useCallback(
    (info) => {
      onRangeChange({
        start: info.start.toISOString(),
        end: info.end.toISOString(),
      });
    },
    [onRangeChange],
  );

  const handleEventClick = useCallback(
    (info) => {
      const props = info.event.extendedProps ?? {};
      if (props.source === "google") {
        onGoogleClick(String(props.htmlLink ?? ""));
        return;
      }
      if ((props.source === "crm" || props.source === "deadline") && typeof props.taskId === "string") {
        onTaskClick(
          props.taskId,
          typeof props.parentTaskId === "string" ? props.parentTaskId : "",
        );
      }
    },
    [onGoogleClick, onTaskClick],
  );

  const handleEventDrop = useCallback(
    async (info) => {
      const props = info.event.extendedProps ?? {};
      if (props.source !== "crm" || typeof props.taskId !== "string" || typeof props.slotId !== "string") return;
      const slotIndex = typeof props.slotIndex === "number" ? props.slotIndex : undefined;
      try {
        await onScheduleUpdate(
          props.taskId,
          props.slotId,
          toIso(info.event.start),
          toIso(info.event.end),
          slotIndex,
        );
      } catch {
        info.revert();
      }
    },
    [onScheduleUpdate],
  );

  const handleEventResize = useCallback(
    async (info) => {
      const props = info.event.extendedProps ?? {};
      if (props.source !== "crm" || typeof props.taskId !== "string" || typeof props.slotId !== "string") return;
      const slotIndex = typeof props.slotIndex === "number" ? props.slotIndex : undefined;
      try {
        await onScheduleUpdate(
          props.taskId,
          props.slotId,
          toIso(info.event.start),
          toIso(info.event.end),
          slotIndex,
        );
      } catch {
        info.revert();
      }
    },
    [onScheduleUpdate],
  );

  const handleEventReceive = useCallback(
    async (info) => {
      const el = info.draggedEl;
      const taskId = el?.getAttribute?.("data-task-id") ?? "";
      if (!taskId) {
        info.revert();
        return;
      }

      const startIso = toIso(info.event.start);
      const endIso = toIso(info.event.end);
      const receiveKey = `${taskId}|${startIso}|${endIso}`;
      if (receiveInFlightRef.current.has(receiveKey)) {
        info.event.remove();
        return;
      }

      receiveInFlightRef.current.add(receiveKey);
      try {
        await onScheduleCreate(taskId, startIso, endIso);
        info.event.remove();
      } catch {
        info.revert();
      } finally {
        receiveInFlightRef.current.delete(receiveKey);
      }
    },
    [onScheduleCreate],
  );

  const handleEventRemove = useCallback(
    async (info) => {
      const props = info.event.extendedProps ?? {};
      if (props.source !== "crm" || typeof props.taskId !== "string" || typeof props.slotId !== "string") return;
      const slotIndex = typeof props.slotIndex === "number" ? props.slotIndex : undefined;
      try {
        await onScheduleDelete(props.taskId, props.slotId, slotIndex);
      } catch {
        info.revert();
      }
    },
    [onScheduleDelete],
  );

  const renderEventContent = useCallback(
    (arg) => {
      const props = arg.event.extendedProps ?? {};
      if (props.source === "deadline") {
        return (
          <div
            className="truncate px-0.5 font-sans text-[10px] font-semibold leading-tight"
            style={{ color: CALENDAR_CARD_TEXT_COLOR }}
          >
            {arg.event.title}
          </div>
        );
      }
      if (props.source !== "crm") {
        return <div className="truncate px-0.5 leading-tight">{arg.event.title}</div>;
      }

      const dueDate = typeof props.dueDate === "string" ? props.dueDate.trim() : "";
      const startKey = arg.event.start ? dateKeyFromIso(toIso(arg.event.start)) : "";
      const dueKey = dueDate ? dueDate.slice(0, 10) : "";
      const showDue = Boolean(dueKey && dueKey !== startKey);
      const assignees = Array.isArray(props.assignees) ? props.assignees : [];
      const taskId = typeof props.taskId === "string" ? props.taskId : "";
      const slotId = typeof props.slotId === "string" ? props.slotId : "";
      const slotIndex = typeof props.slotIndex === "number" ? props.slotIndex : undefined;
      const canEdit = props.canEdit === true;

      return (
        <CalendarCrmEventContent
          title={String(arg.event.title ?? "")}
          dueDate={dueDate}
          showDue={showDue}
          assignees={assignees}
          canEdit={canEdit}
          taskId={taskId}
          slotId={slotId}
          slotIndex={slotIndex}
          onRemove={onScheduleDelete}
        />
      );
    },
    [onScheduleDelete],
  );

  const isMonth = viewMode === "month";

  return (
    <div
      className={cn(
        "calendar-host relative min-h-[520px] [&_.fc]:font-sans",
        isMonth && "calendar-host-month min-h-[640px]",
        "[&_.fc-header-toolbar]:mb-2 [&_.fc-header-toolbar]:gap-2",
        "[&_.fc-toolbar-chunk:last-child]:min-w-[7.5rem]",
        "[&_.fc-event]:cursor-pointer [&_.fc-event]:font-medium",
        "[&_.calendar-event-crm]:cursor-grab [&_.calendar-event-crm.fc-event-dragging]:cursor-grabbing",
        "[&_.calendar-event-crm_.fc-event-main]:pointer-events-none",
        "[&_.calendar-event-highlight]:ring-2 [&_.calendar-event-highlight]:ring-agency-brand [&_.calendar-event-highlight]:ring-offset-1",
        "[&_.calendar-event-deadline]:border-dashed [&_.calendar-event-deadline]:text-[10px]",
      )}
    >
      <div
        className="pointer-events-none absolute right-2 top-2 z-10 sm:right-3 [&_*]:pointer-events-auto"
        aria-label="Kalendervisning"
      >
        <PulseSegmentedControl
          size="sm"
          active={viewMode}
          onChange={(id) => onViewModeChange(/** @type {"week" | "month"} */ (id))}
          tabs={[
            { id: "week", label: "Uge" },
            { id: "month", label: "Måned" },
          ]}
        />
      </div>
      <Calendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]}
        locale={daLocale}
        initialView={isMonth ? "dayGridMonth" : "timeGridWeek"}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        views={{
          timeGridWeek: {
            slotMinTime: "07:00:00",
            slotMaxTime: "20:00:00",
            allDaySlot: true,
            allDaySlotHeight: 28,
          },
          dayGridMonth: {
            dayMaxEvents: 4,
            fixedWeekCount: false,
            displayEventTime: true,
          },
        }}
        weekends={false}
        hiddenDays={[0, 6]}
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        allDaySlot
        allDaySlotHeight={28}
        height="auto"
        expandRows
        nowIndicator
        editable={editable}
        droppable={editable}
        eventDurationEditable={editable}
        eventStartEditable={editable}
        events={fcEvents}
        eventContent={renderEventContent}
        eventDidMount={applyEventColors}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventReceive={handleEventReceive}
        eventRemove={handleEventRemove}
        eventClassNames={(arg) => {
          const source = arg.event.extendedProps?.source;
          const slotId = arg.event.extendedProps?.slotId;
          return cn(
            source === "google" && "calendar-event-google",
            source === "crm" && "calendar-event-crm",
            source === "deadline" && "calendar-event-deadline",
            slotId && slotId === highlightedSlotId && "calendar-event-highlight",
          );
        }}
      />
    </div>
  );
});

/** Re-export for sidebar drag setup. */
export { Draggable };
