/** FullCalendar event colors aligned with TaskStatusChip agency palette. */

import { CALENDAR_CARD_TEXT_COLOR } from "@/lib/crm/calendar-task-assignees";

/** @type {Record<string, { bg: string; border: string; text: string }>} */
export const CALENDAR_TASK_STATUS_COLORS = {
  todo: { bg: "#e8eaed", border: "#c4c8cf", text: CALENDAR_CARD_TEXT_COLOR },
  doing: { bg: "#dce8ff", border: "#7ba3ff", text: CALENDAR_CARD_TEXT_COLOR },
  review: { bg: "#fff3d6", border: "#e6b84d", text: CALENDAR_CARD_TEXT_COLOR },
  done: { bg: "#ddf5e8", border: "#5fbf8a", text: CALENDAR_CARD_TEXT_COLOR },
  blocked: { bg: "#fde2e2", border: "#e07070", text: CALENDAR_CARD_TEXT_COLOR },
  cancelled: { bg: "#eef0f2", border: "#b8bcc4", text: CALENDAR_CARD_TEXT_COLOR },
};

/**
 * @param {string} status
 */
export function calendarColorsForTaskStatus(status) {
  return CALENDAR_TASK_STATUS_COLORS[status] ?? CALENDAR_TASK_STATUS_COLORS.todo;
}

/** Google Calendar events — distinct purple/indigo so CRM tasks stand apart. */
export const CALENDAR_GOOGLE_EVENT_COLORS = {
  bg: "#ede9fe",
  border: "#8b5cf6",
  text: "#5b21b6",
};
