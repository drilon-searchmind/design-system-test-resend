/** Servicekatalog til kontrakter — delt mellem send-dialog, API og underskrift. */

/** Den oprindelige engangs-web linje (legacy key på ældre kontrakter). */
export const ONE_OFF_WEB_SERVICE_KEY = "oneoff-web";

export const SERVICE_BILLING_TYPES = /** @type {const} */ (["monthly", "one_off", "annual"]);

export const SERVICE_BILLING_OPTIONS = [
  { value: "monthly", label: "Løbende (kr/md)" },
  { value: "one_off", label: "Engangs" },
  { value: "annual", label: "Årlig (kr/år)" },
];

/** @typedef {"monthly" | "one_off" | "annual"} ServiceBilling */

/**
 * @typedef {object} ContractServiceOption
 * @property {string} key
 * @property {string} name
 * @property {ServiceBilling} billing
 * @property {string} [departmentKey]
 * @property {number} [defaultAmount]
 */

/** @param {unknown} raw */
export function normalizeServiceBilling(raw) {
  const s = String(raw ?? "");
  return /** @type {ServiceBilling} */ (
    SERVICE_BILLING_TYPES.includes(/** @type {ServiceBilling} */ (s)) ? s : "monthly"
  );
}

/** @param {string | undefined | null} type */
export function isRecurringContractType(type) {
  return !type || type === "retainer" || type === "subscription";
}

/**
 * Standardlisten når kataloget er tomt: én løbende linje pr. afdeling + Web (engangs).
 * @param {Array<{ key: string; name: string }>} departments
 * @returns {ContractServiceOption[]}
 */
export function buildFallbackContractServices(departments) {
  return [
    ...departments.map((d) => ({
      key: d.key,
      name: d.name,
      billing: /** @type {ServiceBilling} */ ("monthly"),
      departmentKey: d.key,
    })),
    {
      key: ONE_OFF_WEB_SERVICE_KEY,
      name: "Web (engangs)",
      billing: /** @type {ServiceBilling} */ ("one_off"),
      departmentKey: "web",
    },
  ];
}

/**
 * Faktureringstype + afdeling for en gemt kontraktlinje. Ældre linjer har hverken `billing`
 * eller `departmentKey`: "oneoff-web" er engangs-web, alt andet er en afdelingsnøgle (kr/md).
 * @param {{ key?: unknown; billing?: unknown; departmentKey?: unknown }} line
 * @returns {{ billing: ServiceBilling; departmentKey: string }}
 */
export function classifyServiceLine(line) {
  const key = String(line?.key ?? "").trim();
  if (line?.billing == null || line.billing === "") {
    if (key === ONE_OFF_WEB_SERVICE_KEY) return { billing: "one_off", departmentKey: "web" };
    return { billing: "monthly", departmentKey: key };
  }
  return {
    billing: normalizeServiceBilling(line.billing),
    departmentKey: String(line.departmentKey ?? "").trim(),
  };
}

/**
 * Engangslinjen der lander i kundens `oneOffWebAmount` (web-afdelingen eller legacy-nøglen).
 * @param {{ key?: unknown; billing?: unknown; departmentKey?: unknown }} line
 */
export function isOneOffWebLine(line) {
  const c = classifyServiceLine(line);
  return (
    c.billing === "one_off" &&
    (String(line?.key ?? "") === ONE_OFF_WEB_SERVICE_KEY || c.departmentKey === "web")
  );
}

/**
 * Løbende aftaler: `value` (det gemte vederlag / kontrakttekstens kr/md) er kun kr/md-linjer;
 * engangs- og årlige linjer holdes udenfor. Kontraktoversigtens MRR lægger årlige linjer til
 * med 1/12 pr. måned (se `annualLinesMonthlyShare`). Øvrige aftaletyper: alt summeres som samlet beløb.
 * @param {Array<{ key?: unknown; billing?: unknown; departmentKey?: unknown; amount?: unknown }>} lines
 * @param {string | undefined} type
 */
export function summarizeServiceLines(lines, type) {
  const recurring = isRecurringContractType(type);
  let all = 0;
  let monthly = 0;
  let oneOff = 0;
  let annual = 0;
  for (const l of lines) {
    const amount = Number(l?.amount ?? 0);
    if (!(amount > 0)) continue;
    all += amount;
    const { billing } = classifyServiceLine(l);
    if (billing === "one_off") oneOff += amount;
    else if (billing === "annual") annual += amount;
    else monthly += amount;
  }
  return { all, monthly, oneOff, annual, value: recurring ? monthly : all, recurring };
}

/** @param {number} n */
function roundKr(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Årlige linjers bidrag pr. måned (beløb ÷ 12) på løbende aftaler; 0 for øvrige aftaletyper,
 * hvor årlige linjer allerede indgår i det samlede beløb.
 * @param {unknown} lines
 * @param {string | undefined} type
 */
export function annualLinesMonthlyShare(lines, type) {
  if (!isRecurringContractType(type) || !Array.isArray(lines)) return 0;
  let annual = 0;
  for (const l of lines) {
    const amount = Number(l?.amount ?? 0);
    if (amount > 0 && classifyServiceLine(l).billing === "annual") annual += amount;
  }
  return roundKr(annual / 12);
}

/**
 * Enhedssuffiks i kontrakttekst/preview.
 * @param {{ key?: unknown; billing?: unknown; departmentKey?: unknown }} line
 * @param {string | undefined} type
 */
export function serviceLineUnitDa(line, type) {
  const { billing } = classifyServiceLine(line);
  if (billing === "one_off") return "engang";
  if (billing === "annual") return "/ år";
  return isRecurringContractType(type) ? "/ md" : "engang";
}
