import { DEPARTMENTS, TASK_TEMPLATES, TEAM } from "@/lib/crm/static-data";

/**
 * Mapper demo-rækker til samme wire som Mongo (`buildTaskTemplateWireRow`).
 */
function mapDemoToWire(tt) {
  return {
    id: tt.id,
    mongoId: "",
    name: tt.name,
    hint: tt.hint,
    dept: tt.dept,
    defaultPriority: tt.defaultPriority,
    defaultDueOffsetDays: tt.defaultDueOffsetDays,
    estHours: tt.estHours,
    assigneeMemberKeys: Array.isArray(tt.assigneeMemberKeys) ? tt.assigneeMemberKeys : [],
    billable: tt.billable !== false,
    scope: tt.scope,
    active: tt.active,
    updatedAt: tt.updatedAt,
    usedCount: tt.usedCount,
  };
}

/** @returns {{ source: 'demo'; templates: ReturnType<typeof mapDemoToWire>[]; departments: typeof DEPARTMENTS; team: typeof TEAM; summary: Record<string, number> }} */
export function getTaskTemplatesDemoBundle() {
  const templates = TASK_TEMPLATES.map(mapDemoToWire);
  const activeCount = templates.filter((t) => t.active).length;
  const deptsHit = new Set(templates.map((t) => t.dept)).size;
  const totalUsage = templates.reduce((s, t) => s + t.usedCount, 0);

  /** @type {typeof DEPARTMENTS} */
  const departments = DEPARTMENTS;

  return {
    source: /** @type {const} */ ("demo"),
    templates,
    departments,
    team: TEAM,
    summary: {
      total: templates.length,
      activeCount,
      deptCoverageDen: DEPARTMENTS.length,
      deptCoverageNum: deptsHit,
      totalUsage,
    },
  };
}
