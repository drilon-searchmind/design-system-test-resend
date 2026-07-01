/**
 * @param {Record<string, unknown>} doc
 * @param {Record<string, number>} [hoursByClientId]
 */
export function mapClientForPulse(doc, hoursByClientId = {}) {
  const id = String(doc._id);
  const slug = String(doc.slug ?? id);
  /** @type {Record<string, number>} */
  let allocation = {};
  if (doc.allocation && typeof doc.allocation === "object") {
    if (doc.allocation instanceof Map) {
      allocation = Object.fromEntries(doc.allocation);
    } else {
      allocation = /** @type {Record<string, number>} */ (doc.allocation);
    }
  }

  const hoursThisMonth =
    hoursByClientId[id] ??
    (typeof doc.hoursThisMonth === "number" ? doc.hoursThisMonth : 0);
  const hoursBudget = typeof doc.hoursBudget === "number" ? doc.hoursBudget : 0;

  return {
    id: slug,
    name: String(doc.name ?? "—"),
    industry: doc.industry ? String(doc.industry) : "",
    logo: String(doc.logoInitials ?? doc.name?.toString().slice(0, 2).toUpperCase() ?? "?"),
    hue: typeof doc.hue === "number" ? doc.hue : 220,
    retainer: typeof doc.retainerAmount === "number" ? doc.retainerAmount : 0,
    currency: String(doc.currency ?? "DKK"),
    status: String(doc.status ?? "active"),
    health: /** @type {'ok' | 'warn' | 'bad'} */ (doc.health ?? "ok"),
    lastActivity: String(doc.lastActivityLabel ?? "—"),
    owner: String(doc.ownerMemberKey ?? ""),
    allocation,
    servicesActive: Array.isArray(doc.servicesActive) ? doc.servicesActive.map(String) : [],
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    hoursThisMonth,
    hoursBudget,
    monthlyProfitMargin:
      typeof doc.monthlyProfitMargin === "number" ? doc.monthlyProfitMargin : 0,
    utilisationHistory: Array.isArray(doc.utilisationHistory)
      ? doc.utilisationHistory.map(Number)
      : [],
    cvr: typeof doc.cvr === "string" ? doc.cvr : undefined,
    leadSource: typeof doc.leadSource === "string" ? doc.leadSource : undefined,
    lastContactedAt: toIsoDateOnly(doc.lastContactedAt) || undefined,
    customerClickUpId:
      typeof doc.customerClickUpId === "string" ? doc.customerClickUpId : undefined,
    clickUpTaskName: typeof doc.clickUpTaskName === "string" ? doc.clickUpTaskName : undefined,
    marketingStartMrr:
      typeof doc.marketingStartMrr === "number" ? doc.marketingStartMrr : undefined,
    marketingUpsellMrr:
      typeof doc.marketingUpsellMrr === "number" ? doc.marketingUpsellMrr : undefined,
    agreementType: typeof doc.agreementType === "string" ? doc.agreementType : undefined,
  };
}

/** @param {Date | string | undefined | null} d */
function toIsoDateOnly(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
