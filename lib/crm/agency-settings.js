/**
 * Justerbare nøgletal-parametre (Indstillinger → Beregninger).
 * Standardværdierne bruges, indtil en admin gemmer egne værdier i databasen.
 */

/**
 * @typedef {object} AgencySettings
 * @property {number} profitabilityPerEmployee Månedligt kravbeløb pr. medarbejder (kr)
 * @property {number} weightIndeks Vægt for Indeks i sundhedsscore (relativ)
 * @property {number} weightNps Vægt for NPS i sundhedsscore (relativ)
 * @property {number} weightTime Vægt for tidsforbrug i sundhedsscore (relativ)
 * @property {number} indeksSensitivity Scorepoint pr. Indeks-point over/under 100
 * @property {number} overBudgetPenalty Scorepoint der trækkes pr. 100 % overforbrug af timebudget
 * @property {number} topClientsCount Antal kunder i "Top sunde / usunde"
 * @property {number} healthyThreshold Score fra og med hvilken en kunde er "sund"
 * @property {number} warnThreshold Score fra og med hvilken en kunde er "advarsel" (under = usund)
 */

/** @type {AgencySettings} */
export const DEFAULT_AGENCY_SETTINGS = {
  profitabilityPerEmployee: 180_000,
  weightIndeks: 35,
  weightNps: 35,
  weightTime: 30,
  indeksSensitivity: 1.25,
  overBudgetPenalty: 150,
  topClientsCount: 10,
  healthyThreshold: 70,
  warnThreshold: 50,
};

/**
 * Felt-metadata til formularen og valideringen.
 * @type {Array<{
 *   key: keyof AgencySettings;
 *   label: string;
 *   hint: string;
 *   min: number;
 *   max: number;
 *   step: number;
 *   unit?: string;
 *   integer?: boolean;
 *   group: "profitability" | "health" | "lists";
 * }>}
 */
export const AGENCY_SETTING_FIELDS = [
  {
    key: "profitabilityPerEmployee",
    label: "Krav pr. medarbejder",
    hint: "Rentabilitet pr. afdeling = medarbejdere × dette beløb ÷ solgt MRR.",
    min: 0,
    max: 10_000_000,
    step: 1000,
    unit: "kr / md",
    group: "profitability",
  },
  {
    key: "weightIndeks",
    label: "Vægt: Indeks",
    hint: "Relativ vægt i sundhedsscoren. Vægtene normaliseres, så de ikke behøver give 100.",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    group: "health",
  },
  {
    key: "weightNps",
    label: "Vægt: NPS",
    hint: "Relativ vægt for seneste NPS.",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    group: "health",
  },
  {
    key: "weightTime",
    label: "Vægt: Tid brugt",
    hint: "Relativ vægt for tidsforbrug ift. timebudget (afledt af retainer).",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    group: "health",
  },
  {
    key: "indeksSensitivity",
    label: "Indeks-følsomhed",
    hint: "Hvor mange scorepoint ét Indeks-point flytter scoren (100 = neutral, giver 50).",
    min: 0,
    max: 10,
    step: 0.05,
    group: "health",
  },
  {
    key: "overBudgetPenalty",
    label: "Straf for overforbrug",
    hint: "Scorepoint der trækkes for hver 100 % kunden bruger over timebudgettet.",
    min: 0,
    max: 500,
    step: 5,
    group: "health",
  },
  {
    key: "healthyThreshold",
    label: "Grænse: sund",
    hint: "Score fra og med denne værdi vises grøn.",
    min: 0,
    max: 100,
    step: 1,
    integer: true,
    group: "health",
  },
  {
    key: "warnThreshold",
    label: "Grænse: advarsel",
    hint: "Score fra og med denne værdi (men under 'sund') vises gul. Under er rød.",
    min: 0,
    max: 100,
    step: 1,
    integer: true,
    group: "health",
  },
  {
    key: "topClientsCount",
    label: "Antal i Top-lister",
    hint: "Antal kunder i boksene 'Top sunde kunder' og 'Top usunde kunder' på Pulse.",
    min: 1,
    max: 50,
    step: 1,
    integer: true,
    group: "lists",
  },
];

/**
 * Validér og fuldfør (manglende felter → standard). Returnerer fejl ved ugyldige tal.
 * @param {unknown} raw
 * @returns {{ settings: AgencySettings } | { error: string }}
 */
export function validateAgencySettings(raw) {
  const input = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  /** @type {Record<string, number>} */
  const out = { ...DEFAULT_AGENCY_SETTINGS };
  for (const f of AGENCY_SETTING_FIELDS) {
    if (!(f.key in input)) continue;
    const n = Number(input[f.key]);
    if (!Number.isFinite(n)) return { error: `${f.label}: ugyldigt tal` };
    if (n < f.min || n > f.max) return { error: `${f.label}: skal være mellem ${f.min} og ${f.max}` };
    out[f.key] = f.integer ? Math.round(n) : n;
  }
  if (out.weightIndeks + out.weightNps + out.weightTime <= 0) {
    return { error: "Mindst én vægt i sundhedsscoren skal være større end 0" };
  }
  if (out.warnThreshold > out.healthyThreshold) {
    return { error: "Grænse for advarsel kan ikke være højere end grænsen for sund" };
  }
  return { settings: /** @type {AgencySettings} */ (out) };
}

/**
 * Tolerant normalisering af en gemt/delvis værdi (bruges ved læsning) — aldrig fejl.
 * @param {unknown} raw
 * @returns {AgencySettings}
 */
export function normalizeAgencySettings(raw) {
  const res = validateAgencySettings(raw);
  return "settings" in res ? res.settings : { ...DEFAULT_AGENCY_SETTINGS };
}
