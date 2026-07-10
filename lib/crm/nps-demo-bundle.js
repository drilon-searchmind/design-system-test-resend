import {
  formatReportPeriodLabel,
  formatReportPeriodSubtitle,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import {
  npsActiveClientsMeasured,
  npsAgencyAverageLatest,
  npsAgencyAveragePrevious,
  npsAgencyTrendMonthly,
  npsAtRiskLatestCount,
  npsDashboardClients,
  npsImprovingClientsCount,
  npsLatestDistributionBuckets,
} from "@/lib/crm/nps-utils";
import { CLIENTS, NPS_LAST_ROUND, NPS_TEMPLATES, NPS_UPCOMING_SENDS } from "@/lib/crm/static-data";
import { DEFAULT_NPS_SEND_DATES, computeNextSendOccurrences } from "@/lib/nps/settings-utils";

/**
 * @param {{ year?: number; month?: number }} [opts]
 */
export function getNpsDemoBundle(opts = {}) {
  const period = normalizeReportPeriod({ year: opts.year, month: opts.month });
  const clientList = CLIENTS;

  const avgLatest = npsAgencyAverageLatest(clientList);
  const buckets = npsLatestDistributionBuckets(clientList);
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
    avgLatest,
    avgPrev: npsAgencyAveragePrevious(clientList),
    measured: npsActiveClientsMeasured(clientList).length,
    rollupTotal: npsDashboardClients(clientList).length,
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
    atRisk: npsAtRiskLatestCount(clientList),
    improving: npsImprovingClientsCount(2, clientList),
    clients: npsDashboardClients(clientList),
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
