import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import TimeEntry from "@/lib/db/models/time-entry";
import { mapClientForPulse } from "@/lib/crm/map-pulse-client";
import { buildContractRetainerSumByClientId, enrichClientRetainer } from "@/lib/crm/retainer-utils";
import { TASK_TERMINAL_STATUSES } from "@/lib/crm/tasks-portfolio-filter";
import {
  endOfReportMonth,
  formatReportPeriodLabel,
  getDaysInMonth,
  isCurrentReportPeriod,
  normalizeReportPeriod,
  shiftReportPeriod,
  startOfReportMonth,
} from "@/lib/crm/report-period";
import { connectDb } from "@/lib/db/mongoose";
import { enrichMembersWithUserImages } from "@/lib/server/member-user-images";
import {
  buildTaskDepartmentLookup,
  effectiveTimeEntryDepartmentKey,
} from "@/lib/server/resolve-time-entry-department";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

function colorTokenToVar(token) {
  if (!token) return "var(--agency-dep-seo)";
  if (token.startsWith("#") || token.startsWith("oklch") || token.startsWith("rgb")) {
    return token;
  }
  if (token.startsWith("--")) return `var(${token})`;
  return `var(--${token})`;
}

/**
 * @param {Record<string, unknown>} doc
 */
function mapDepartment(doc) {
  const key = String(doc.key);
  return {
    id: key,
    name: String(doc.name),
    color: colorTokenToVar(doc.colorToken ? String(doc.colorToken) : key),
    short: String(doc.shortLabel ?? doc.name ?? key).slice(0, 4),
    capacity: typeof doc.capacityHours === "number" ? doc.capacityHours : 0,
  };
}

/**
 * @param {Record<string, unknown>} doc
 */
function mapTeamMember(doc) {
  const imageRaw = typeof doc.image === "string" ? doc.image.trim() : "";
  return {
    id: String(doc.key),
    name: String(doc.name),
    role: String(doc.roleTitle ?? ""),
    dept: String(doc.departmentKey ?? ""),
    avatar: String(doc.avatarInitials ?? doc.name?.toString().slice(0, 2).toUpperCase() ?? "?"),
    hue: typeof doc.hue === "number" ? doc.hue : 220,
    weeklyHours: typeof doc.weeklyHours === "number" ? doc.weeklyHours : 37,
    image: imageRaw || undefined,
  };
}

function roundHours(hours) {
  if (!Number.isFinite(hours)) return 0;
  return Math.round(hours * 100) / 100;
}

/**
 * @param {Record<string, unknown>[]} taskDocs
 * @param {Record<string, unknown>[]} clientDocs
 */
function buildTaskEstimateAggregates(taskDocs, clientDocs) {
  /** @type {Record<string, string>} */
  const clientIdToSlug = {};
  for (const c of clientDocs) {
    clientIdToSlug[String(c._id)] = String(c.slug ?? c._id);
  }

  /** @type {Record<string, number>} */
  const byClientSlug = {};
  /** @type {Record<string, number>} */
  const byDept = {};

  for (const t of Array.isArray(taskDocs) ? taskDocs : []) {
    const st = String(t.status ?? "");
    if (TASK_TERMINAL_STATUSES.includes(/** @type {(typeof TASK_TERMINAL_STATUSES)[number]} */ (st))) {
      continue;
    }
    const eh =
      typeof t.estimateHours === "number" && Number.isFinite(t.estimateHours) ? t.estimateHours : 0;
    if (eh <= 0) continue;

    const cid = t.clientId != null ? String(t.clientId) : "";
    const slug = cid ? clientIdToSlug[cid] : "";
    if (slug) byClientSlug[slug] = (byClientSlug[slug] ?? 0) + eh;

    const dept = typeof t.departmentKey === "string" ? t.departmentKey.trim() : "";
    if (dept) byDept[dept] = (byDept[dept] ?? 0) + eh;
  }

  for (const k of Object.keys(byClientSlug)) {
    byClientSlug[k] = roundHours(byClientSlug[k]);
  }
  for (const k of Object.keys(byDept)) {
    byDept[k] = roundHours(byDept[k]);
  }

  return { byClientSlug, byDept };
}

/**
 * @param {import('@/lib/crm/pulse-types').PulseClient[]} clients
 * @param {import('@/lib/crm/pulse-types').PulseDepartment[]} departments
 * @param {Record<string, number>} hoursByDept
 * @param {Record<string, number>} budgetByDept
 * @param {Record<string, number>} [estimatedHoursByDept]
 */
function buildDeptPerformance(clients, departments, hoursByDept, budgetByDept, estimatedHoursByDept = {}) {
  return departments.map((d) => {
    let revenue = 0;
    let budgetFromClientsSum = 0;
    for (const c of clients) {
      if (c.status !== "active") continue;
      const pct = (c.allocation?.[d.id] ?? 0) / 100;
      revenue += c.retainer * pct;
      budgetFromClientsSum += c.hoursBudget * pct;
    }
    const hours = roundHours(hoursByDept[d.id] ?? 0);
    const budgetFromClients = budgetFromClientsSum > 0;
    const budget = Math.round(budgetFromClientsSum || d.capacity || 1);
    const util = budget > 0 ? hours / budget : 0;
    const estimatedHoursOpen = estimatedHoursByDept[d.id] ?? 0;
    return {
      dept: d.id,
      revenue: Math.round(revenue),
      hours,
      budget,
      util,
      budgetFromClients,
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });
}

/**
 * @param {import('@/lib/crm/pulse-types').PulseClient[]} clients
 */
function buildSmartAlerts(clients) {
  /** @type {import('@/lib/crm/pulse-types').PulseSmartAlert[]} */
  const alerts = [];
  let n = 0;
  for (const c of clients) {
    if (c.status !== "active") continue;
    if (c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget * 1.05) {
      const pct = Math.round(((c.hoursThisMonth / c.hoursBudget) - 1) * 100);
      alerts.push({
        id: `db-over-${n++}`,
        severity: pct > 20 ? "bad" : "warn",
        client: c.id,
        type: "overBudget",
        title: `${c.name} — ${pct}% over budget`,
        body: `${c.hoursThisMonth.toFixed(1)} / ${c.hoursBudget} t denne måned.`,
        age: "nu",
      });
    }
    if (c.health === "bad") {
      alerts.push({
        id: `db-health-bad-${n++}`,
        severity: "bad",
        client: c.id,
        type: "health",
        title: `${c.name} — kritisk sundhed`,
        body: "Kunden er markeret med kritisk sundhed i CRM.",
        age: "—",
      });
    } else if (c.health === "warn") {
      alerts.push({
        id: `db-health-warn-${n++}`,
        severity: "warn",
        client: c.id,
        type: "health",
        title: `${c.name} — advarsel`,
        body: "Kunden kræver opmærksomhed (sundhed: advarsel).",
        age: "—",
      });
    }
  }
  return alerts.slice(0, 12);
}

/**
 * @param {Record<string, unknown>[]} entries
 * @param {number} year
 * @param {number} month 1–12
 */
function buildUtilTrend(entries, year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);
  const byDay = /** @type {Record<number, { billable: number; overhead: number }>} */ ({});
  for (let d = 1; d <= daysInMonth; d++) {
    byDay[d] = { billable: 0, overhead: 0 };
  }
  for (const e of entries) {
    const workedAt = e.workedAt ? new Date(String(e.workedAt)) : null;
    if (!workedAt || workedAt < monthStart || workedAt >= monthEnd) continue;
    const day = workedAt.getDate();
    const hours = (Number(e.durationMinutes) || 0) / 60;
    if (e.billable === false) {
      byDay[day].overhead += hours;
    } else {
      byDay[day].billable += hours;
    }
  }
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    billable: Math.round(byDay[i + 1].billable * 10) / 10,
    overhead: Math.round(byDay[i + 1].overhead * 10) / 10,
  }));
}

/**
 * @param {import('@/lib/crm/pulse-types').PulseClient[]} clients
 * @param {number} billableHoursMonth
 * @param {number} totalCapacityMonth
 * @param {number} overheadHours
 * @param {number} billableHoursPrev
 * @param {number} overheadHoursPrev
 * @param {number} totalCapacityPrev
 */
function buildAgencyMetrics(
  clients,
  billableHoursMonth,
  totalCapacityMonth,
  overheadHours,
  billableHoursPrev,
  overheadHoursPrev,
  totalCapacityPrev,
) {
  const active = clients.filter((c) => c.status === "active");
  const retainerMRR = active.reduce((s, c) => s + c.retainer, 0);
  const margins = active
    .map((c) => c.monthlyProfitMargin)
    .filter((m) => typeof m === "number" && m > 0);
  const avgMargin =
    margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0.25;
  const utilisation =
    totalCapacityMonth > 0 ? billableHoursMonth / totalCapacityMonth : 0;
  const utilisationPrev =
    totalCapacityPrev > 0 ? billableHoursPrev / totalCapacityPrev : 0;
  const totalHours = billableHoursMonth + overheadHours;
  const overheadPct = totalHours > 0 ? overheadHours / totalHours : 0;
  const totalHoursPrev = billableHoursPrev + overheadHoursPrev;
  const overheadPctPrev = totalHoursPrev > 0 ? overheadHoursPrev / totalHoursPrev : 0;

  return {
    retainerMRR,
    retainerMRRPrev: Math.round(retainerMRR * 0.96),
    utilisation: Math.min(utilisation, 1.2),
    utilisationPrev: Math.min(utilisationPrev, 1.2),
    overheadPct,
    overheadPctPrev,
    billableHoursMonth: Math.round(billableHoursMonth),
    billableHoursPrev: Math.round(billableHoursPrev),
    avgMargin,
    avgMarginPrev: Math.max(0, avgMargin - 0.02),
    activeClients: active.length,
    healthyClients: active.filter((c) => c.health === "ok").length,
    warnClients: active.filter((c) => c.health === "warn").length,
    badClients: active.filter((c) => c.health === "bad").length,
  };
}

/**
 * @param {{ includeTest?: boolean; year?: number; month?: number }} [opts]
 */
export async function fetchPulseBundle(opts = {}) {
  const includeTest = Boolean(opts.includeTest);
  const { year, month } = normalizeReportPeriod(opts);
  const prev = shiftReportPeriod(year, month, -1);
  const monthStart = startOfReportMonth(year, month);
  const monthEnd = endOfReportMonth(year, month);
  const prevStart = startOfReportMonth(prev.year, prev.month);
  const rangeStart = prevStart;

  await connectDb();

  const entityFilter = buildIsTestQuery(includeTest ? "all" : "production");

  const [departmentsRaw, clientsRaw, teamRaw, openTaskEstimatesRaw] = await Promise.all([
    Department.find(entityFilter).sort({ name: 1 }).lean(),
    Client.find(entityFilter).sort({ name: 1 }).lean(),
    TeamMember.find({ ...entityFilter, active: { $ne: false } }).sort({ name: 1 }).lean(),
    Task.find({
      ...entityFilter,
      status: { $nin: [...TASK_TERMINAL_STATUSES] },
      estimateHours: { $gt: 0 },
    })
      .select("clientId departmentKey estimateHours status")
      .lean(),
  ]);

  const clientIds = clientsRaw.map((c) => String(c._id));

  const contractDocs =
    clientsRaw.length ?
      await Contract.find({
        ...entityFilter,
        clientId: { $in: clientsRaw.map((c) => c._id) },
      })
        .select("clientId value status type signedAt")
        .lean()
    : [];
  const retainerSumByClientId = buildContractRetainerSumByClientId(
    /** @type {Record<string, unknown>[]} */ (contractDocs),
  );

  const entryFilter = {
    workedAt: { $gte: rangeStart, $lt: monthEnd },
    ...(clientIds.length ? { clientId: { $in: clientIds } } : { clientId: null }),
  };

  const entries = clientIds.length
    ? await TimeEntry.find(entryFilter).select("clientId departmentKey taskId durationMinutes billable workedAt").lean()
    : [];

  const taskDeptById = await buildTaskDepartmentLookup(entries, entityFilter);

  /** @type {Record<string, number>} */
  const hoursByClientId = {};
  /** @type {Record<string, number>} */
  const hoursByDept = {};
  let billableHoursMonth = 0;
  let overheadHoursMonth = 0;
  let billableHoursPrev = 0;
  let overheadHoursPrev = 0;

  for (const e of entries) {
    const hours = (Number(e.durationMinutes) || 0) / 60;
    const workedAt = e.workedAt ? new Date(String(e.workedAt)) : null;
    if (!workedAt) continue;

    const inMonth = workedAt >= monthStart && workedAt < monthEnd;
    const inPrev = workedAt >= prevStart && workedAt < monthStart;
    const cid = e.clientId ? String(e.clientId) : "";
    const dept = effectiveTimeEntryDepartmentKey(
      /** @type {Record<string, unknown>} */ (e),
      taskDeptById,
    );

    if (inMonth) {
      if (e.billable === false) overheadHoursMonth += hours;
      else billableHoursMonth += hours;
      if (cid) hoursByClientId[cid] = (hoursByClientId[cid] ?? 0) + hours;
      if (dept) hoursByDept[dept] = (hoursByDept[dept] ?? 0) + hours;
    } else if (inPrev) {
      if (e.billable === false) overheadHoursPrev += hours;
      else billableHoursPrev += hours;
    }
  }

  const departments = departmentsRaw.map(mapDepartment);
  const { byClientSlug: estimatedByClientSlug, byDept: estimatedHoursByDept } = buildTaskEstimateAggregates(
    openTaskEstimatesRaw,
    clientsRaw,
  );

  const clients = clientsRaw.map((doc) => {
    const slug = String(doc.slug ?? doc._id);
    const base = mapClientForPulse(doc, hoursByClientId);
    const estimatedHoursOpen = estimatedByClientSlug[slug] ?? 0;
    const enriched = enrichClientRetainer(base, retainerSumByClientId[String(doc._id)] ?? 0);
    return {
      ...enriched,
      hoursThisMonth: roundHours(enriched.hoursThisMonth),
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });

  const teamEnriched = await enrichMembersWithUserImages(teamRaw);
  const team = teamEnriched.map(mapTeamMember);
  const totalCapacityMonth = team.reduce((s, m) => s + m.weeklyHours * 4.33, 0);
  const totalCapacityPrev = totalCapacityMonth;

  const budgetByDept = Object.fromEntries(
    departments.map((d) => [d.id, d.capacity || 0]),
  );

  return {
    source: /** @type {'database'} */ ("database"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    agencyMetrics: buildAgencyMetrics(
      clients,
      billableHoursMonth,
      totalCapacityMonth,
      overheadHoursMonth,
      billableHoursPrev,
      overheadHoursPrev,
      totalCapacityPrev,
    ),
    clients,
    departments,
    deptPerformance: buildDeptPerformance(
      clients,
      departments,
      hoursByDept,
      budgetByDept,
      estimatedHoursByDept,
    ),
    utilTrend: buildUtilTrend(entries, year, month),
    smartAlerts: buildSmartAlerts(clients),
    team,
  };
}
