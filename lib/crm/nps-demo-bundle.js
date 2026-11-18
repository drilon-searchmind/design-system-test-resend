import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import { effectiveNpsInterval, npsClientAgeStatus } from "@/lib/crm/nps-cadence";
import {
  npsAgencyTrendMonthly,
  npsDashboardClients,
  npsDashboardEntities,
  npsRollingKpis,
} from "@/lib/crm/nps-utils";
import { CLIENTS, NPS_LAST_ROUND, NPS_TEMPLATES, NPS_UPCOMING_SENDS } from "@/lib/crm/static-data";
import { DEFAULT_NPS_SEND_DATES, computeNextSendOccurrences } from "@/lib/nps/settings-utils";

/**
 * Demo-fixtures har svar langt tilbage i tiden — vinduet forankres i seneste demo-svar,
 * så "seneste 2 måneder" viser noget meningsfuldt.
 * @param {typeof CLIENTS} clientList
 */
function latestDemoResponseDate(clientList) {
  let latest = "";
  for (const c of clientList) {
    for (const e of c.npsHistory ?? []) {
      const d = typeof e.respondedAt === "string" ? e.respondedAt.slice(0, 10) : "";
      if (d > latest && !Number.isNaN(new Date(`${d}T12:00:00`).getTime())) latest = d;
    }
  }
  return latest ? new Date(`${latest}T23:59:59`) : new Date();
}

/**
 * @param {{ year?: number; month?: number }} [opts]
 */
export function getNpsDemoBundle(opts = {}) {
  const period = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const clientList = CLIENTS;

  const rolling = npsRollingKpis(clientList, latestDemoResponseDate(clientList));
  const buckets = rolling.distribution;
  const withData = buckets.withData > 0 ? buckets.withData : 1;
  const promoterRatio = buckets.promoters / withData;
  const passiveRatio = buckets.passive / withData;
  const detractorRatio = buckets.detractors / withData;
  const rr =
    NPS_LAST_ROUND.invitations > 0 ? NPS_LAST_ROUND.responses / NPS_LAST_ROUND.invitations : 0;
  const trendSeries = npsAgencyTrendMonthly(clientList, period);

  return {
    source: "demo",
    reportPeriod: { year: period.year, month: period.month },
    reportPeriodLabel: formatReportPeriodLabel(period.year, period.month),
    reportPeriodSubtitle: formatReportPeriodSubtitle(period.year, period.month),
    kpiWindow: rolling.window,
    avgLatest: rolling.avgLatest,
    avgPrev: rolling.avgPrev,
    measured: rolling.measured,
    rollupTotal: npsDashboardEntities(clientList).length,
    distribution: buckets,
    promoterRatio,
    passiveRatio,
    detractorRatio,
    responseRate: rr,
    lastRound: {
      invitations: NPS_LAST_ROUND.invitations,
      responses: NPS_LAST_ROUND.responses,
      medianHoursToRespond: NPS_LAST_ROUND.medianHoursToRespond,
    },
    lastRoundCaptionDemo: true,
    trend: trendSeries.values,
    trendLabels: trendSeries.labels,
    atRisk: rolling.atRisk,
    improving: rolling.improving,
    clients: npsDashboardClients(clientList).map((c) => ({
      ...c,
      npsInterval: effectiveNpsInterval(c.npsInterval),
      npsTooNew: npsClientAgeStatus(c).tooNew,
    })),
    templates: NPS_TEMPLATES.map((t) => ({ ...t, isDefault: t.id === "default" })),
    upcomingSends: NPS_UPCOMING_SENDS,
    sendLog: {
      totalSent: 38,
      totalFailed: 1,
      recent: [],
    },
    recentResponses: [],
    settings: {
      autoSendEnabled: true,
      sendTimeLocal: "09:00",
      sendDates: DEFAULT_NPS_SEND_DATES,
      nextOccurrences: computeNextSendOccurrences(DEFAULT_NPS_SEND_DATES, { limit: 8 }),
    },
  };
}
