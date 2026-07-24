"use client";

import { CALENDAR_GOOGLE_EVENT_COLORS, CALENDAR_TASK_STATUS_COLORS } from "@/lib/crm/calendar-task-colors";
import { TASK_STATUS_SECTION_LABELS, TASK_STATUS_SECTION_ORDER } from "@/lib/crm/task-utils";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-muted/40 px-3 py-2 md:px-4">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
        Forklaring
      </span>
      {TASK_STATUS_SECTION_ORDER.map((status) => {
        const colors = CALENDAR_TASK_STATUS_COLORS[status];
        if (!colors) return null;
        return (
          <span key={status} className="inline-flex items-center gap-1.5 font-sans text-[11px] text-fg-muted">
            <span
              className="size-3 rounded-sm border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              aria-hidden
            />
            {TASK_STATUS_SECTION_LABELS[status] ?? status}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-fg-muted">
        <span
          className="size-3 rounded-sm border border-dashed"
          style={{
            backgroundColor: "#fff3d6",
            borderColor: "#e6b84d",
          }}
          aria-hidden
        />
        Deadline (hel dag)
      </span>
      <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-fg-muted">
        <span
          className="size-3 rounded-sm border"
          style={{
            backgroundColor: CALENDAR_GOOGLE_EVENT_COLORS.bg,
            borderColor: CALENDAR_GOOGLE_EVENT_COLORS.border,
          }}
          aria-hidden
        />
        Google Calendar
      </span>
    </div>
  );
}
