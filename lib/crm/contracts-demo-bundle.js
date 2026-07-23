import { CONTRACT_DEMO_REF_DATE, contractNeedsRenewalSoon } from "@/lib/crm/contract-utils";
import {
  formatReportPeriodLabel,
  isCurrentReportPeriod,
  normalizeReportPeriod,
} from "@/lib/crm/report-period";
import { CONTRACTS, TEAM } from "@/lib/crm/static-data";

/**
 * @param {{ year?: number; month?: number }} [opts]
 */
export function getContractsDemoBundle(opts = {}) {
  const { year, month } = normalizeReportPeriod(opts);
  const renewalReferenceIso = CONTRACT_DEMO_REF_DATE;

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
    contracts: CONTRACTS,
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
