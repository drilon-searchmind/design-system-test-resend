import {
  AGENCY_METRICS,
  CLIENTS,
  computeDeptCapacity,
  DEPARTMENTS,
  DEPT_PERFORMANCE,
  TEAM,
  TASKS,
} from "./static-data";
import { taskIsDone, taskIsOverdue } from "./task-utils";

/** @typedef {'ok' | 'burn' | 'sell' | 'tight'} WorkloadDeptTone */

/**
 * Beregn kapacitet, tidsallokering og risiko pr. disciplin — bruger `computeDeptCapacity` + mock performance.
 */
export function buildDeptWorkloadRows() {
  const capRows = computeDeptCapacity();
  return DEPARTMENTS.map((d) => {
    const row = capRows.find((c) => c.dept === d.id);
    const perf = DEPT_PERFORMANCE.find((p) => p.dept === d.id);
    const capacity = row?.capacity ?? d.capacity;
    const assigned = row?.assigned ?? 0;
    const tracked = row?.tracked ?? 0;
    const delta = tracked - assigned;
    const riskOverBurn = assigned > 0 && tracked > assigned * 1.05;
    const riskOversell = capacity > 0 && assigned > capacity * 0.98;
    const perfUtil = perf?.util ?? 0;
    const riskTight = perfUtil >= 0.98 && perfUtil <= 1.12;

    /** @type {WorkloadDeptTone} */
    let tone = "ok";
    if (riskOverBurn) tone = "burn";
    else if (riskOversell) tone = "sell";
    else if (riskTight) tone = "tight";

    return {
      dept: d,
      capacity,
      assigned,
      tracked,
      delta,
      riskOverBurn,
      riskOversell,
      riskTight,
      tone,
      perf,
    };
  });
}

/**
 * @param {ReturnType<typeof buildDeptWorkloadRows>} rows
 */
export function workloadAgencyTotals(rows) {
  return {
    capacity: rows.reduce((s, r) => s + r.capacity, 0),
    assigned: rows.reduce((s, r) => s + r.assigned, 0),
    tracked: rows.reduce((s, r) => s + r.tracked, 0),
  };
}

/** Åbne opgaver pr. medlem + simpel belægningsindikator (mock). */
export function buildTeamWorkloadRows() {
  return TEAM.map((m) => {
    const open = TASKS.filter((t) => !taskIsDone(t.status) && t.assigneeId === m.id);
    const high = open.filter((t) => t.priority === "high").length;
    const overdue = open.filter((t) => taskIsOverdue(t)).length;
    const perf = DEPT_PERFORMANCE.find((p) => p.dept === m.dept);
    const util = perf?.util ?? 1;
    const loadIndex = Math.min(
      100,
      Math.round(28 + open.length * 11 + high * 8 + overdue * 6 + (util > 1.02 ? 18 : util > 0.95 ? 8 : 0)),
    );
    return {
      member: { ...m, userAccountId: `u-${m.id}` },
      openCount: open.length,
      highCount: high,
      overdueCount: overdue,
      loadIndex,
    };
  }).sort((a, b) => b.loadIndex - a.loadIndex);
}

/** Efterspørgsel fra board: åbne / høj prio / overskredet pr. disciplin. */
export function workloadTaskDemandByDept() {
  return DEPARTMENTS.map((d) => {
    const open = TASKS.filter((t) => !taskIsDone(t.status) && t.dept === d.id);
    return {
      dept: d,
      open: open.length,
      high: open.filter((t) => t.priority === "high").length,
      overdue: open.filter((t) => taskIsOverdue(t)).length,
    };
  });
}

export function workloadOpenTaskStats() {
  const open = TASKS.filter((t) => !taskIsDone(t.status));
  return {
    total: open.length,
    high: open.filter((t) => t.priority === "high").length,
    overdue: open.filter((t) => taskIsOverdue(t)).length,
  };
}

export function workloadActiveClientCount() {
  return CLIENTS.filter((c) => c.status === "active").length;
}

export function workloadAgencyBillableHoursRef() {
  return AGENCY_METRICS.billableHoursMonth;
}
