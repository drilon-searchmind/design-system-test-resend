import { enrichDemoTaskRow } from "@/lib/crm/task-demo-estimates";
import { getTasksDemoBundle } from "@/lib/crm/tasks-demo-bundle";
import { TASKS } from "@/lib/crm/static-data";

/**
 * Demo bundle for Min kalender — all demo tasks (not month-scoped).
 */
export function getCalendarDemoBundle() {
  const base = getTasksDemoBundle();
  const tasks = TASKS.map((t) =>
    /** @type {typeof TASKS[number]} */ (/** @type {unknown} */ (enrichDemoTaskRow(t))),
  );

  return {
    ...base,
    tasks,
    googleCalendar: {
      connected: false,
      connectedAt: null,
      available: false,
    },
    googleEvents: [],
  };
}
