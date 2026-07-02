/** Reference “i dag” for overdue (matcher Kontrakter). */
export const TASK_DEMO_REF_DATE = "2026-05-08";

/** Mock bruger-id — matcher `TEAM.find((m) => m.isMe)`. */
export const TASK_DEMO_USER_ID = "lm";

/** @param {string} status */
export function taskIsDone(status) {
  return status === "done" || status === "cancelled";
}

/** @param {{ status: string; dueDate: string }} task */
export function taskIsOverdue(task, refDateIso = TASK_DEMO_REF_DATE) {
  if (!task.dueDate || String(task.dueDate).trim() === "") return false;
  return !taskIsDone(task.status) && task.dueDate < refDateIso;
}

/**
 * Dage fra reference til deadline (kan være negativ).
 * @param {string} dueDate YYYY-MM-DD
 */
export function taskDaysUntilDue(dueDate, refDateIso = TASK_DEMO_REF_DATE) {
  const ref = new Date(`${refDateIso}T12:00:00`);
  const end = new Date(`${dueDate}T12:00:00`);
  return Math.round((end.getTime() - ref.getTime()) / 86400000);
}

/** @returns {string} YYYY-MM-DD (lokal kalenderdag) */
export function taskDueReferenceTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** @param {'low'|'medium'|'high'} p */
export function taskPriorityRank(p) {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

export const TASK_UI_STATUSES = /** @type {const} */ ([
  "todo",
  "doing",
  "review",
  "done",
  "blocked",
  "cancelled",
]);

/** Liste-/gruppe-rækkefølge — åbne først, færdige nederst. */
export const TASK_STATUS_SECTION_ORDER = /** @type {const} */ ([
  "todo",
  "doing",
  "review",
  "blocked",
  "done",
  "cancelled",
]);

/** @type {Record<(typeof TASK_STATUS_SECTION_ORDER)[number], string>} */
export const TASK_STATUS_SECTION_LABELS = {
  todo: "Afventer",
  doing: "Igangsat",
  review: "Review",
  blocked: "Blokeret",
  done: "Færdig",
  cancelled: "Afbrudt",
};

/** @param {unknown} raw */
export function sanitizeTaskUiStatus(raw) {
  const s = String(raw ?? "todo");
  return TASK_UI_STATUSES.includes(/** @type {any} */ (s)) ? s : "todo";
}
