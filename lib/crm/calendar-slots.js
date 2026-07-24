import { defaultDurationMinutes, toLocalIsoDateTime } from "@/lib/crm/calendar-task-schedule";

/**
 * @param {Date | string} value
 */
function toSlotIso(value) {
  if (value instanceof Date) return toLocalIsoDateTime(value);
  return String(value ?? "");
}

/**
 * @param {unknown} rawId
 * @param {string} start
 * @param {number} index
 */
export function slotIdFromRaw(rawId, start, index) {
  if (typeof rawId === "string" && rawId.trim()) return rawId.trim();
  if (rawId != null && typeof rawId === "object" && "toString" in rawId) {
    const s = String(rawId);
    if (s && s !== "[object Object]") return s;
  }
  if (rawId != null && typeof rawId !== "object") return String(rawId);
  return `local-${index}-${start}`;
}

/**
 * @param {Array<{ id: string; start: string; end: string }>} slots
 */
export function withStableSlotIndices(slots) {
  return slots.map((slot, index) => ({ ...slot, index }));
}

/**
 * Normalize calendar slots from a wire row or mongo doc shape.
 * @param {{
 *   calendarSlots?: Array<{ id?: string; _id?: unknown; start?: string; end?: string }>;
 *   scheduledStart?: string;
 *   scheduledEnd?: string;
 * }} task
 */
export function getTaskCalendarSlots(task) {
  /** @type {Array<{ id: string; start: string; end: string }>} */
  const slots = [];

  if (Array.isArray(task.calendarSlots)) {
    task.calendarSlots.forEach((raw, index) => {
      const start = typeof raw?.start === "string" ? raw.start.trim() : "";
      const end = typeof raw?.end === "string" ? raw.end.trim() : "";
      if (!start) return;
      slots.push({
        id: slotIdFromRaw(raw?.id ?? raw?._id, start, index),
        start,
        end: end || start,
      });
    });
  }

  if (!slots.length && task.scheduledStart?.trim?.()) {
    slots.push({
      id: "legacy",
      start: task.scheduledStart.trim(),
      end: task.scheduledEnd?.trim?.() || task.scheduledStart.trim(),
    });
  }

  return withStableSlotIndices(slots);
}

/**
 * @param {unknown} rawUserId
 * @param {string | undefined} calendarUserId
 */
function slotMatchesCalendarUser(rawUserId, calendarUserId) {
  if (!calendarUserId) return true;
  if (rawUserId == null) return false;
  return String(rawUserId) === calendarUserId;
}

/**
 * Persisted calendarSlots only (no virtual legacy fallback).
 * @param {unknown} taskDoc
 * @param {{ calendarUserId?: string }} [opts]
 */
export function realCalendarSlotsFromMongoDoc(taskDoc, opts = {}) {
  const calendarUserId =
    typeof opts.calendarUserId === "string" ? opts.calendarUserId.trim() : "";
  const rec = /** @type {Record<string, unknown>} */ (taskDoc ?? {});
  /** @type {Array<{ id: string; start: string; end: string }>} */
  const slots = [];

  const rawSlots = Array.isArray(rec.calendarSlots) ? rec.calendarSlots : [];
  rawSlots.forEach((raw, index) => {
    const s = /** @type {Record<string, unknown>} */ (raw ?? {});
    if (!slotMatchesCalendarUser(s.userId, calendarUserId || undefined)) return;
    const start = s.start instanceof Date ? toSlotIso(s.start) : typeof s.start === "string" ? s.start : "";
    const end = s.end instanceof Date ? toSlotIso(s.end) : typeof s.end === "string" ? s.end : "";
    if (!start) return;
    const id = slotIdFromRaw(s._id ?? s.id, start, index);
    slots.push({ id, start, end: end || start });
  });

  return slots;
}

/**
 * @param {unknown} taskDoc
 * @param {{ calendarUserId?: string }} [opts]
 */
export function calendarSlotsFromMongoDoc(taskDoc, opts = {}) {
  const slots = realCalendarSlotsFromMongoDoc(taskDoc, opts);
  const rec = /** @type {Record<string, unknown>} */ (taskDoc ?? {});
  const calendarUserId =
    typeof opts.calendarUserId === "string" ? opts.calendarUserId.trim() : "";

  if (!calendarUserId && !slots.length && rec.scheduledStart instanceof Date) {
    slots.push({
      id: "legacy",
      start: toSlotIso(rec.scheduledStart),
      end:
        rec.scheduledEnd instanceof Date ?
          toSlotIso(rec.scheduledEnd)
        : toSlotIso(rec.scheduledStart),
    });
  }

  return slots;
}

/**
 * @param {Date} start
 * @param {Date} end
 * @param {number | null | undefined} estimateHours
 */
export function normalizeSlotRange(start, end, estimateHours) {
  let s = new Date(start);
  let e = end ? new Date(end) : null;
  if (Number.isNaN(s.getTime())) return null;
  if (!e || Number.isNaN(e.getTime()) || e <= s) {
    e = new Date(s.getTime() + defaultDurationMinutes(estimateHours) * 60_000);
  }
  return { start: s, end: e };
}
