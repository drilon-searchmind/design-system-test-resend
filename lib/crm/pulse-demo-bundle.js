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
import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";
import { latestNpsFromHistory, mockIndeks } from "@/lib/crm/client-metrics";
import { buildMrrBridge, deriveMrrByMonth } from "@/lib/crm/pulse-kpi-utils";
import { lastMonths } from "@/lib/crm/month-series";
import { deptSoldMrr } from "@/lib/crm/dept-profitability";
import { monthKey, summarizeUpsellsForMonth } from "@/lib/crm/upsell-utils";
import { taskIsDone } from "@/lib/crm/task-utils";
import { enrichDemoTaskRow } from "@/lib/crm/task-demo-estimates";

/** @typedef {import('@/lib/crm/pulse-types').PulseBundle} PulseBundle */

/** Demo-kundegrupper (CVR → navn). Brands med samme CVR i static-data grupperes automatisk. */
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
 * Deterministiske 12-måneders demo-serier. MRR udledes af demo-kundernes start/stop og
 * MRR-stigninger; udnyttelse følger kundernes timehistorik; overhead og margin svinger let
 * omkring demo-tallene. Sidste punkt = kortets værdi, næstsidste = "forrige måned".
 *
 * @param {number} year
 * @param {number} month
 * @param {Array<Record<string, any>>} brandClients
 * @param {number} mrrNow
 * @returns {import('@/lib/crm/pulse-types').PulseKpiTrends}
 */
function buildDemoKpiTrends(year, month, brandClients, mrrNow) {
  const months = lastMonths(new Date(year, month - 1, 1));
  const lastIdx = months.length - 1;
  const derivedMrr = deriveMrrByMonth(brandClients, months.map((m) => m.key));

  // Sum af aktive kunders timehistorik (12 mdr., nyeste sidst), skaleret så sidste punkt = udnyttelse nu.
  const hoursByMonth = Array.from({ length: months.length }, () => 0);
  for (const c of brandClients) {
    if (c.status !== "active" || !Array.isArray(c.utilisationHistory)) continue;
    const hist = c.utilisationHistory.slice(-months.length);
    const offset = months.length - hist.length;
    hist.forEach((v, i) => {
      hoursByMonth[offset + i] += Number(v) || 0;
    });
  }
  const hoursNow = hoursByMonth[lastIdx] || 1;

  /** @param {number} i */
  const wave = (i) => Math.sin((month + i) * 1.7 + 0.5);
  const round = (/** @type {number} */ v) => Math.round(v * 1000) / 1000;
  const point = (/** @type {number} */ i, /** @type {number | null} */ value) => ({ label: months[i].label, value });

  // Demo-kundernes startdatoer ligger mest før vinduet, så den udledte MRR er flad; en lille
  // fast stigning (prisreguleringer/ældre salg) gør demo-grafen mere realistisk.
  const demoMrr = (/** @type {number} */ i) => {
    const base = derivedMrr[i];
    if (base == null || i >= lastIdx - 1) return base;
    return Math.round(base * (1 - (lastIdx - 1 - i) * 0.006 + wave(i) * 0.003));
  };

  return {
    mrr: months.map((_, i) => point(i, i === lastIdx ? mrrNow : demoMrr(i))),
    utilisation: months.map((_, i) =>
      point(
        i,
        i === lastIdx ? AGENCY_METRICS.utilisation
        : i === lastIdx - 1 ? AGENCY_METRICS.utilisationPrev
        : round(Math.min((AGENCY_METRICS.utilisation * hoursByMonth[i]) / hoursNow, 1.2)),
      ),
    ),
    overhead: months.map((_, i) =>
      point(
        i,
        i === lastIdx ? AGENCY_METRICS.overheadPct
        : i === lastIdx - 1 ? AGENCY_METRICS.overheadPctPrev
        : round(AGENCY_METRICS.overheadPctPrev + wave(i) * 0.025),
      ),
    ),
    margin: months.map((_, i) =>
      point(
        i,
        i === lastIdx ? AGENCY_METRICS.avgMargin
        : i === lastIdx - 1 ? AGENCY_METRICS.avgMarginPrev
        : round(AGENCY_METRICS.avgMarginPrev - (lastIdx - 1 - i) * 0.004 + wave(i) * 0.012),
      ),
    ),
  };
}

/**
 * @param {{ year?: number; month?: number }} [opts]
 * @returns {PulseBundle}
 */
export function getPulseDemoBundle(opts = {}) {
  const { year, month } = normalizeReportPeriod(opts);
  const { byClientId, byDept } = aggregateDemoTaskEstimates(TASKS.map((t) => enrichDemoTaskRow(t)));

  const periodKey = monthKey(year, month);
  const brandClients = CLIENTS.map((c) => {
    const estimatedHoursOpen = byClientId[c.id] ?? 0;
    return {
      ...c,
      ...(c.upsells ? { upsellMonth: summarizeUpsellsForMonth(c.upsells, periodKey) } : {}),
      latestNps: latestNpsFromHistory(c.npsHistory),
      indeks: mockIndeks(c.id),
      hoursThisMonth: roundHours(c.hoursThisMonth),
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });

  const clients = annotateClientsWithGroups(brandClients, DEMO_CLIENT_GROUP_NAMES);
  const activeEntities = buildCustomerEntities(clients).filter((c) => c.status === "active");

  const deptPerformance = DEPT_PERFORMANCE.map((row) => {
    const estimatedHoursOpen = byDept[row.dept] ?? 0;
    const sold = deptSoldMrr(brandClients, row.dept);
    return {
      ...row,
      revenue: sold.total,
      soldMrrBreakdown: sold,
      hours: roundHours(row.hours),
      ...(estimatedHoursOpen > 0 ? { estimatedHoursOpen } : {}),
    };
  });

  const demoMrrBridge = buildMrrBridge(clients, monthKey(year, month));
  const baseDemoMetrics = {
    ...AGENCY_METRICS,
    retainerMRR: demoMrrBridge.end,
    retainerMRRPrev: Math.round(demoMrrBridge.start),
  };

  return {
    source: "demo",
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    agencyMetrics: {
      ...baseDemoMetrics,
      overheadHoursMonth: Math.round(
        (AGENCY_METRICS.billableHoursMonth * AGENCY_METRICS.overheadPct) / Math.max(1 - AGENCY_METRICS.overheadPct, 0.01),
      ),
      upsellMrr: activeEntities.reduce((s, c) => s + (c.upsellMonth?.amount ?? 0), 0),
      activeClients: activeEntities.length,
      healthyClients: activeEntities.filter((c) => c.health === "ok").length,
      warnClients: activeEntities.filter((c) => c.health === "warn").length,
      badClients: activeEntities.filter((c) => c.health === "bad").length,
    },
    clients,
    mrrBridge: demoMrrBridge,
    kpiTrends: buildDemoKpiTrends(year, month, brandClients, demoMrrBridge.end),
    departments: DEPARTMENTS,
    deptPerformance,
    utilTrend: UTIL_TREND,
    smartAlerts: SMART_ALERTS,
    team: TEAM,
    agencySettings: DEFAULT_AGENCY_SETTINGS,
  };
}
