import { CONTRACT_DEMO_REF_DATE, contractNeedsRenewalSoon } from "@/lib/crm/contract-utils";
import {
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import { annotateClientsWithGroups } from "@/lib/crm/client-groups";
import { CLIENTS, CONTRACTS, TEAM } from "@/lib/crm/static-data";

/**
 * @param {{ year?: number; month?: number }} [opts]
 */
export function getContractsDemoBundle(opts = {}) {
  const { year, month } = normalizeReportPeriod(opts);
  const renewalReferenceIso = CONTRACT_DEMO_REF_DATE;

  const groupById = new Map(
    annotateClientsWithGroups(CLIENTS)
      .filter((c) => c.groupCvr)
      .map((c) => [c.id, { groupCvr: c.groupCvr, groupName: c.groupName }]),
  );
  const contracts = CONTRACTS.map((c) => {
    const g = groupById.get(c.clientId);
    return g ? { ...c, ...g } : c;
  });

  const activeRows = CONTRACTS.filter((c) => c.accountStatus === "active");
  const pausedCount = CONTRACTS.filter((c) => c.accountStatus === "paused").length;
  const mrrActiveDkk = activeRows.reduce((sum, c) => sum + (c.currency === "DKK" ? c.monthlyValue : 0), 0);
  const renewalSoonCount = CONTRACTS.filter((c) =>
    contractNeedsRenewalSoon(c, 90, renewalReferenceIso),
  ).length;

  return {
    source: /** @type {const} */ ("demo"),
    period: {
      year,
      month,
      label: formatReportPeriodLabel(year, month),
      isCurrent: isCurrentReportPeriod(year, month),
    },
    renewalReferenceIso,
    contracts,
    team: TEAM,
    summary: {
      total: CONTRACTS.length,
      activeCount: activeRows.length,
      mrrActiveDkk,
      mrrOverlapActiveDkk: mrrActiveDkk,
      renewalSoonCount,
      pausedCount,
      pendingSignatureCount: 0,
    },
  };
}
