import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";

/** Standard månedligt kravbeløb pr. medarbejder (kan justeres under Indstillinger → Beregninger). */
export const PROFITABILITY_PER_EMPLOYEE = DEFAULT_AGENCY_SETTINGS.profitabilityPerEmployee;

/**
 * Rentabilitet pr. afdeling = (medarbejdere × 180.000) / solgt MRR.
 * Under 100 % = solgt MRR dækker afdelingens krav.
 *
 * @param {{ employees: number; soldMrr: number; perEmployee?: number }} input
 * @returns {{ target: number; ratio: number | null }}
 */
export function computeDeptProfitability({
  employees,
  soldMrr,
  perEmployee = PROFITABILITY_PER_EMPLOYEE,
}) {
  const target = Math.max(0, employees) * perEmployee;
  const ratio = soldMrr > 0 ? target / soldMrr : null;
  return { target, ratio };
}

/** @param {Record<string, number> | undefined} budgets */
function hasServiceBudgets(budgets) {
  return !!budgets && Object.values(budgets).some((n) => Number(n) > 0);
}

/**
 * Solgt MRR for én afdeling ud fra aktive kunder. Kilde pr. kunde:
 *  1. Afdelingsbudgetter (`serviceBudgets`, kr/md) hvis de er udfyldt — den præcise kilde.
 *  2. Ellers retainer × allokerings-% (fallback, ofte tom i den rigtige database).
 * Oveni kommer tillæg i periode (`temporary_mrr`) for den valgte måned, hvis de har afdeling.
 * Engangsbeløb og fast MRR-stigning tæller ikke her (sidstnævnte ligger allerede i MRR).
 *
 * @param {Array<Record<string, any>>} clients brand-niveau klienter
 * @param {string} deptId
 * @returns {{ total: number; fromBudgets: number; fromAllocation: number; fromUpsells: number }}
 */
export function deptSoldMrr(clients, deptId) {
  let fromBudgets = 0;
  let fromAllocation = 0;
  let fromUpsells = 0;
  for (const c of clients) {
    if (c.status !== "active") continue;
    if (hasServiceBudgets(c.serviceBudgets)) {
      fromBudgets += Number(c.serviceBudgets?.[deptId]) || 0;
    } else {
      fromAllocation += (Number(c.retainer) || 0) * ((Number(c.allocation?.[deptId]) || 0) / 100);
    }
    for (const u of c.upsellMonth?.items ?? []) {
      if (u.type === "temporary_mrr" && u.department === deptId) fromUpsells += Number(u.amount) || 0;
    }
  }
  return {
    total: Math.round(fromBudgets + fromAllocation + fromUpsells),
    fromBudgets: Math.round(fromBudgets),
    fromAllocation: Math.round(fromAllocation),
    fromUpsells: Math.round(fromUpsells),
  };
}