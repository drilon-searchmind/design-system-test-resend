/** Månedligt kravbeløb pr. medarbejder, brugt i rentabilitet pr. afdeling. */
export const PROFITABILITY_PER_EMPLOYEE = 180_000;

/**
 * Rentabilitet pr. afdeling = (medarbejdere × 180.000) / solgt MRR.
 * Under 100 % = solgt MRR dækker afdelingens krav.
 *
 * @param {{ employees: number; soldMrr: number }} input
 * @returns {{ target: number; ratio: number | null }}
 */
export function computeDeptProfitability({ employees, soldMrr }) {
  const target = Math.max(0, employees) * PROFITABILITY_PER_EMPLOYEE;
  const ratio = soldMrr > 0 ? target / soldMrr : null;
  return { target, ratio };
}
