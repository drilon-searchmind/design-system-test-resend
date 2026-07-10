import { formatReportPeriodLabel, isCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { portfolioRowIncludedInMonth } from "@/lib/crm/tasks-portfolio-filter";
import { enrichDemoTaskRow } from "@/lib/crm/task-demo-estimates";
import { CLIENTS, DEPARTMENTS, TASKS, TASK_TEMPLATES, TEAM } from "@/lib/crm/static-data";
import { TASK_DEMO_USER_ID, taskDueReferenceTodayIso, taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";

/**
 * @param {{ year?: number; month?: number }} [opts]
 */
export function getTasksDemoBundle(opts = {}) {
  const { year, month } = normalizeReportPeriod(opts);
  const overdueRefIso = taskDueReferenceTodayIso();
  /** @type {typeof TASKS} */
  const tasks = TASKS.filter((t) => portfolioRowIncludedInMonth(t, year, month)).map((t) =>
    /** @type {typeof TASKS[number]} */ (/** @type {unknown} */ (enrichDemoTaskRow(t))),
  );

  const openCount = tasks.filter((t) => !taskIsDone(t.status)).length;
  const overdueCount = tasks.filter((t) => taskIsOverdue(t, overdueRefIso)).length;
  const mineCount = tasks.filter((t) => t.assigneeId === TASK_DEMO_USER_ID).length;
  const highOpen = tasks.filter((t) => !taskIsDone(t.status) && t.priority === "high").length;

  const departments = DEPARTMENTS.map((d) => ({
    id: d.id,
    name: d.name,
    short: d.short,
    color: typeof d.color === "string" ? d.color : "var(--dep-seo)",
  }));

  /** @type {{ value: string; label: string }[]} */
  const clientsPicklist = CLIENTS.map((c) => ({
    value: c.id,
    label: c.name,
  })).sort((a, b) => a.label.localeCompare(b.label, "da"));

  /** @type {{ key: string; title: string; hint: string; departmentKey: string; priority: "high" | "medium" | "low"; suggestedHours: number | null; defaultDueOffsetDays: number; assigneeMemberKeys: string[]; billable: boolean }[]} */
  const taskTemplatesForCreate = TASK_TEMPLATES.filter((t) => t.active).map((t) => ({
    key: t.id,
    title: t.name,
    hint: t.hint,
    departmentKey: t.dept,
    priority:
      t.defaultPriority === "high" || t.defaultPriority === "low"
        ? t.defaultPriority
        : /** @type {"medium"} */ ("medium"),
    suggestedHours: typeof t.estHours === "number" && Number.isFinite(t.estHours) ? t.estHours : null,
    defaultDueOffsetDays:
      typeof t.defaultDueOffsetDays === "number" && Number.isFinite(t.defaultDueOffsetDays) ?
        t.defaultDueOffsetDays
      : 0,
    assigneeMemberKeys: Array.isArray(t.assigneeMemberKeys) ? t.assigneeMemberKeys : [],
    billable: t.billable !== false,
  }));

  return {
    source: /** @type {const} */ ("demo"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    taskDueReferenceIso: overdueRefIso,
    overdueRefIso,
    mineAssigneeKey: TASK_DEMO_USER_ID,
    tasks,
    team: TEAM,
    departments,
    clientsPicklist,
    taskTemplatesForCreate,
    summary: {
      total: tasks.length,
      openCount,
      overdueCount,
      mineCount,
      highOpen,
    },
  };
}
