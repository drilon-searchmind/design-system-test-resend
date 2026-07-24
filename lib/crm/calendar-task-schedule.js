const DEFAULT_START_HOUR = 9;
const DEFAULT_DURATION_MINUTES = 60;

/**
 * @param {Date} d
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {Date} d
 */
export function toLocalIsoDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} hour
 * @param {number} minute
 */
export function localDateTimeFromParts(isoDate, hour = DEFAULT_START_HOUR, minute = 0) {
  const [y, m, day] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, day, hour, minute, 0, 0);
}

/**
 * @param {number} estimateHours
 */
export function defaultDurationMinutes(estimateHours) {
  if (typeof estimateHours === "number" && Number.isFinite(estimateHours) && estimateHours > 0) {
    return Math.min(Math.round(estimateHours * 60), 8 * 60);
  }
  return DEFAULT_DURATION_MINUTES;
}

/**
 * Resolve calendar placement for a task wire row.
 * @param {{
 *   scheduledStart?: string | null;
 *   scheduledEnd?: string | null;
 *   dueDate?: string;
 *   estimateHours?: number | null;
 *   title?: string;
 *   status?: string;
 *   id?: string;
 *   isSubTask?: boolean;
 *   parentTaskId?: string;
 * }} task
 */
export function resolveTaskCalendarRange(task) {
  const startRaw = task.scheduledStart?.trim?.() ? task.scheduledStart : null;
  const endRaw = task.scheduledEnd?.trim?.() ? task.scheduledEnd : null;

  if (startRaw) {
    const start = new Date(startRaw);
    if (!Number.isNaN(start.getTime())) {
      let end = endRaw ? new Date(endRaw) : null;
      if (!end || Number.isNaN(end.getTime()) || end <= start) {
        end = new Date(start.getTime() + defaultDurationMinutes(task.estimateHours) * 60_000);
      }
      return { start, end, timed: true, source: /** @type {const} */ ("scheduled") };
    }
  }

  const due = task.dueDate?.trim?.() ? task.dueDate.trim().slice(0, 10) : "";
  if (due) {
    const start = localDateTimeFromParts(due, DEFAULT_START_HOUR, 0);
    const end = new Date(start.getTime() + defaultDurationMinutes(task.estimateHours) * 60_000);
    return { start, end, timed: true, source: /** @type {const} */ ("dueDate") };
  }

  return null;
}

/**
 * @param {Date} d
 */
export function isWeekendDate(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Snap a Date to nearest weekday (Mon–Fri) at same local time.
 * @param {Date} d
 */
export function snapToWeekday(d) {
  const out = new Date(d);
  while (isWeekendDate(out)) {
    out.setDate(out.getDate() + (out.getDay() === 6 ? 2 : 1));
  }
  return out;
}
