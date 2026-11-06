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
