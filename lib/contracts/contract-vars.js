/** Template variables + agreement-details block shared by the send flow. */

/** Tokens that put commercial terms into a contract document. */
const TERMS_TOKENS = ["{{monthlyValue}}", "{{services}}", "{{servicesList}}"];

/**
 * @param {string | Date | undefined | null} d
 */
function formatDateDa(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * @param {number | undefined} value
 * @param {string} currency
 */
export function formatContractMoney(value, currency = "DKK") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `${value.toLocaleString("da-DK", { maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * @param {{
 *   clientName: string;
 *   signerName: string;
 *   contractLabel: string;
 *   noticeDays: number | string;
 *   cvr?: string;
 *   value?: number;
 *   currency?: string;
 *   serviceLabels?: string[];
 *   serviceLines?: Array<{ key: string; name: string; amount: number }>;
 *   type?: string;
 *   startDate?: Date | string;
 *   renewalDate?: Date | string;
 * }} input
 * @returns {Record<string, string>}
 */
export function buildContractVars(input) {
  const currency = input.currency ?? "DKK";
  const lines = (input.serviceLines ?? []).filter((l) => l && l.name);
  const recurring = !input.type || ["retainer", "subscription"].includes(input.type);
  const lineText = (l) =>
    l.amount > 0 ?
      `${l.name} (${formatContractMoney(l.amount, currency)}${l.key === "oneoff-web" || !recurring ? " engang" : " / md"})`
    : l.name;
  return {
    clientName: input.clientName,
    signerName: input.signerName,
    contractLabel: input.contractLabel,
    noticeDays: String(input.noticeDays),
    today: new Date().toISOString().slice(0, 10),
    clientCvr: input.cvr ?? "",
    monthlyValue: formatContractMoney(input.value, input.currency ?? "DKK"),
    services: lines.length ? lines.map(lineText).join(", ") : (input.serviceLabels ?? []).join(", "),
    servicesList: lines.length ? lines.map((l) => `- ${lineText(l)}`).join("\n") : "",
    valueLabel: recurring ? "Månedligt vederlag (MRR)" : "Samlet engangsbeløb",
    startDate: formatDateDa(input.startDate),
    renewalDate: formatDateDa(input.renewalDate),
  };
}

/**
 * Templates written before the commercial tokens existed would drop the price and the
 * service lines from the signed document. When a template does not reference them,
 * append an "Aftaledetaljer" block so the customer always sees what they sign.
 * @param {string} source raw template/document text (before rendering)
 * @param {Record<string, string>} vars
 */
export function withAgreementDetails(source, vars) {
  if (TERMS_TOKENS.some((t) => source.includes(t))) return source;

  /** @type {string[]} */
  const lines = [];
  if (vars.clientCvr) lines.push(`**CVR:** ${vars.clientCvr}  `);
  if (vars.servicesList) lines.push(`**Ydelser (service lines):**\n\n${vars.servicesList}\n`);
  else if (vars.services) lines.push(`**Ydelser (service lines):** ${vars.services}  `);
  if (vars.monthlyValue) lines.push(`**${vars.valueLabel ?? "Månedligt vederlag (MRR)"}:** ${vars.monthlyValue}  `);
  if (vars.startDate) lines.push(`**Startdato:** ${vars.startDate}  `);
  if (vars.renewalDate) lines.push(`**Fornyelse:** ${vars.renewalDate}  `);
  if (!lines.length) return source;

  return `${source.trimEnd()}\n\n## Aftaledetaljer\n${lines.join("\n")}\n`;
}
