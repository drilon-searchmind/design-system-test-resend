import {
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import {
  AGENCY_METRICS,
  CLIENTS,
  DEPARTMENTS,
  DEPT_PERFORMANCE,
  SMART_ALERTS,
  TASKS,
  TEAM,
  UTIL_TREND,
} from "@/lib/crm/static-data";
import { annotateClientsWithGroups, buildCustomerEntities } from "@/lib/crm/client-groups";
import { taskIsDone } from "@/lib/crm/task-utils";
import { enrichDemoTaskRow } from "@/lib/crm/task-demo-estimates";

/** @typedef {import('@/lib/crm/pulse-types').PulseBundle} PulseBundle */

/** Demo-koncerner (CVR → navn). Brands med samme CVR i static-data grupperes automatisk. */
export const DEMO_CLIENT_GROUP_NAMES = {
  "55671234": "Folio & Hof Furniture Group",
};

/** @param {number} hours */
function roundHours(hours) {
  if (!Number.isFinite(hours)) return 0;
  return Math.round(hours * 100) / 100;
}

/** @param {typeof TASKS} tasks */
function aggregateDemoTaskEstimates(tasks) {
  /** @type {Record<string, number>} */
  const byClientId = {};
  /** @type {Record<string, number>} */
  const byDept = {};

  for (const t of tasks) {
    if (taskIsDone(t.status)) continue;
    const enriched = enrichDemoTaskRow(t);
    const eh =
      typeof enriched.estimateHours === "number" && Number.isFinite(enriched.estimateHours) ?
        enriched.estimateHours
      : 0;
    if (eh <= 0) continue;
    byClientId[t.clientId] = (byClientId[t.clientId] ?? 0) + eh;
    byDept[t.dept] = (byDept[t.dept] ?? 0) + eh;
  }

  for (const k of Object.keys(byClientId)) byClientId[k] = roundHours(byClientId[k]);
  for (const k of Object.keys(byDept)) byDept[k] = roundHours(byDept[k]);

  return { byClientId, byDept };
}

/**
 * @param {{ year?: number; month?: number }} [opts]
 * @returns {PulseBundle}
 */
export function getPulseDemoBundle(opts = {}) {
  const { year, month } = normalizeReportPeriod(opts);
  const { byClientId, byDept } = aggregateDemoTaskEstimates(TASKS.map((t) => enrichDemoTaskRow(t)));

  const brandClients = CLIENTS.map((c) => {
    const estimatedHoursOpen = byClientId[c.id] ?? 0;
    return {
      ...c,
      hoursThisMonth: roundHours(c.hoursThisMonth),
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });

  const clients = annotateClientsWithGroups(brandClients, DEMO_CLIENT_GROUP_NAMES);
  const activeEntities = buildCustomerEntities(clients).filter((c) => c.status === "active");

  const deptPerformance = DEPT_PERFORMANCE.map((row) => {
    const estimatedHoursOpen = byDept[row.dept] ?? 0;
    return {
      ...row,
      hours: roundHours(row.hours),
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });

  return {
    source: "demo",
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    agencyMetrics: {
      ...AGENCY_METRICS,
      activeClients: activeEntities.length,
      healthyClients: activeEntities.filter((c) => c.health === "ok").length,
      warnClients: activeEntities.filter((c) => c.health === "warn").length,
      badClients: activeEntities.filter((c) => c.health === "bad").length,
    },
    clients,
    departments: DEPARTMENTS,
    deptPerformance,
    utilTrend: UTIL_TREND,
    smartAlerts: SMART_ALERTS,
    team: TEAM,
  };
}
