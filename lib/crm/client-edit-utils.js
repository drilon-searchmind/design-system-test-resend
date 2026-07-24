import { resolveAssigneeToMemberKey } from "@/lib/crm/member-discipline-map";

/** @typedef {import('@/lib/crm/static-data').CLIENTS[number]} ClientDetailShape */

/** @typedef {{ id: string; name: string }} ClientEditTeamPick */

/**
 * Map stored assignee values (name or member key) to member keys for edit dropdowns.
 * @param {Record<string, string>} deptAssignees
 * @param {ClientEditTeamPick[]} [team]
 */
export function normalizeDeptAssigneesForEdit(deptAssignees, team = []) {
  if (!team.length) return { ...deptAssignees };

  const picklist = team.map((m) => ({ key: m.id, name: m.name }));
  /** @type {Record<string, string>} */
  const out = {};
  for (const [deptId, val] of Object.entries(deptAssignees)) {
    const raw = String(val ?? "").trim();
    if (!raw) continue;
    const memberKey = resolveAssigneeToMemberKey(raw, picklist);
    out[deptId] = memberKey ?? raw;
  }
  return out;
}

/**
 * @typedef {object} ClientEditDraft
 * @property {string} slug
 * @property {string} name
 * @property {string} industry
 * @property {string} logoInitials
 * @property {string} hue
 * @property {string} cvr
 * @property {'active' | 'paused' | 'inactive'} status
 * @property {'ok' | 'warn' | 'bad'} health
 * @property {string} ownerMemberKey
 * @property {string} lastActivityLabel
 * @property {string} retainerAmount
 * @property {string} currency
 * @property {string} marketingStartMrr
 * @property {string} marketingUpsellMrr
 * @property {string} agreementType
 * @property {string} annualAdjustmentPct
 * @property {string} startedAt
 * @property {string} renewalAt
 * @property {string} terminatedAt
 * @property {string} lastContactedAt
 * @property {string} leadSource
 * @property {string} googleDriveUrl
 * @property {string} customerClickUpId
 * @property {string} clickUpTaskName
 * @property {string} churnNote
 * @property {string[]} churnReason
 * @property {string} tagsText
 * @property {string[]} servicesActive
 * @property {string} hoursBudget
 * @property {string} monthlyProfitMargin
 * @property {string} npsInterval
 * @property {Record<string, string>} allocationPct
 * @property {Record<string, string>} deptAssignees
 * @property {string} primaryContactName
 * @property {string} primaryContactTitle
 * @property {string} primaryContactEmail
 * @property {string} primaryContactPhone
 * @property {string} primaryContactLinkedin
 * @property {string} secondaryContactName
 * @property {string} secondaryContactTitle
 * @property {string} secondaryContactEmail
 * @property {string} secondaryContactPhone
 * @property {string} secondaryContactLinkedin
 */

/** @param {string | undefined} iso */
function isoToInput(iso) {
  if (!iso || typeof iso !== "string") return "";
  return iso.trim().slice(0, 10);
}

/** @param {unknown} contact */
function contactFields(contact, prefix) {
  const c = contact && typeof contact === "object" ? /** @type {Record<string, unknown>} */ (contact) : {};
  return {
    [`${prefix}Name`]: String(c.name ?? ""),
    [`${prefix}Title`]: String(c.title ?? ""),
    [`${prefix}Email`]: String(c.email ?? ""),
    [`${prefix}Phone`]: String(c.phone ?? ""),
    [`${prefix}Linkedin`]: typeof c.linkedinUrl === "string" ? c.linkedinUrl : "",
  };
}

/**
 * @param {ClientDetailShape} client
 * @param {ClientEditTeamPick[]} [team]
 * @returns {ClientEditDraft}
 */
export function clientToEditDraft(client, team = []) {
  /** @type {Record<string, string>} */
  const allocationPct = {};
  for (const [key, val] of Object.entries(client.allocation ?? {})) {
    allocationPct[key] = String(val ?? "");
  }

  /** @type {Record<string, string>} */
  const deptAssignees = {};
  for (const [key, val] of Object.entries(client.deptAssignees ?? {})) {
    deptAssignees[key] = String(val ?? "");
  }

  const primary = contactFields(client.primaryContact, "primaryContact");
  const secondary = contactFields(client.secondaryContact, "secondaryContact");

  return {
    slug: client.id,
    name: client.name ?? "",
    industry: client.industry ?? "",
    logoInitials: client.logo ?? "",
    hue: String(client.hue ?? 220),
    cvr: client.cvr ?? "",
    status: /** @type {ClientEditDraft['status']} */ (client.status ?? "active"),
    health: /** @type {ClientEditDraft['health']} */ (client.health ?? "ok"),
    ownerMemberKey: client.owner ?? "",
    lastActivityLabel: client.lastActivity ?? "",
    retainerAmount:
      client.retainerBase != null ? String(client.retainerBase)
      : client.retainer != null ? String(client.retainer)
      : "",
    currency: client.currency ?? "DKK",
    marketingStartMrr: client.marketingStartMrr != null ? String(client.marketingStartMrr) : "",
    marketingUpsellMrr: client.marketingUpsellMrr != null ? String(client.marketingUpsellMrr) : "",
    agreementType: client.agreementType ?? "",
    annualAdjustmentPct:
      client.annualAdjustmentPct != null ? String(client.annualAdjustmentPct) : "",
    startedAt: isoToInput(client.startedAt),
    renewalAt: isoToInput(client.renewalAt),
    terminatedAt: isoToInput(client.terminatedAt),
    lastContactedAt: isoToInput(client.lastContactedAt),
    leadSource: client.leadSource ?? "",
    googleDriveUrl: client.googleDriveUrl ?? "",
    customerClickUpId: client.customerClickUpId ?? "",
    clickUpTaskName: client.clickUpTaskName ?? "",
    churnNote: client.churnNote ?? "",
    churnReason: Array.isArray(client.churnReason) ? [...client.churnReason] : [],
    tagsText: (client.tags ?? []).join(", "),
    servicesActive: Array.isArray(client.servicesActive) ? [...client.servicesActive] : [],
    hoursBudget: client.hoursBudget != null ? String(client.hoursBudget) : "",
    monthlyProfitMargin:
      client.monthlyProfitMargin != null ? String(client.monthlyProfitMargin) : "",
    npsInterval: client.npsInterval ?? "quarterly",
    allocationPct,
    deptAssignees: normalizeDeptAssigneesForEdit(deptAssignees, team),
    primaryContactName: primary.primaryContactName,
    primaryContactTitle: primary.primaryContactTitle,
    primaryContactEmail: primary.primaryContactEmail,
    primaryContactPhone: primary.primaryContactPhone,
    primaryContactLinkedin: primary.primaryContactLinkedin,
    secondaryContactName: secondary.secondaryContactName,
    secondaryContactTitle: secondary.secondaryContactTitle,
    secondaryContactEmail: secondary.secondaryContactEmail,
    secondaryContactPhone: secondary.secondaryContactPhone,
    secondaryContactLinkedin: secondary.secondaryContactLinkedin,
  };
}

/** @param {string | undefined} raw */
function parseOptionalNumber(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** @param {string | undefined} raw */
function parseOptionalDate(raw) {
  const s = String(raw ?? "").trim().slice(0, 10);
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : s;
}

/**
 * @param {ClientEditDraft} draft
 * @param {ClientEditTeamPick[]} [team]
 * @returns {Record<string, unknown>}
 */
export function editDraftToPatch(draft, team = []) {
  /** @type {Record<string, number>} */
  const allocation = {};
  for (const [key, val] of Object.entries(draft.allocationPct ?? {})) {
    const n = parseOptionalNumber(val);
    if (n != null && n > 0) allocation[key] = n;
  }

  /** @type {Record<string, string>} */
  const deptAssignees = {};
  for (const [deptKey, val] of Object.entries(draft.deptAssignees ?? {})) {
    const s = String(val ?? "").trim();
    if (!s) continue;
    const member = team.find((m) => m.id === s);
    deptAssignees[deptKey] = member?.name ?? s;
  }

  /** @param {string} prefix */
  function embedContact(prefix) {
    const name = String(draft[`${prefix}Name`] ?? "").trim();
    if (!name) return null;
    return {
      name,
      title: String(draft[`${prefix}Title`] ?? "").trim() || undefined,
      email: String(draft[`${prefix}Email`] ?? "").trim() || undefined,
      phone: String(draft[`${prefix}Phone`] ?? "").trim() || undefined,
      linkedinUrl: String(draft[`${prefix}Linkedin`] ?? "").trim() || undefined,
      isPrimary: prefix === "primaryContact",
    };
  }

  const tags = String(draft.tagsText ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    industry: draft.industry.trim() || null,
    logoInitials: draft.logoInitials.trim().slice(0, 4) || null,
    hue: parseOptionalNumber(draft.hue),
    cvr: draft.cvr.trim() || null,
    status: draft.status,
    health: draft.health,
    ownerMemberKey: draft.ownerMemberKey.trim() || null,
    lastActivityLabel: draft.lastActivityLabel.trim() || null,
    retainerAmount: parseOptionalNumber(draft.retainerAmount),
    currency: draft.currency.trim() || "DKK",
    marketingStartMrr: parseOptionalNumber(draft.marketingStartMrr),
    marketingUpsellMrr: parseOptionalNumber(draft.marketingUpsellMrr),
    agreementType: draft.agreementType.trim() || null,
    annualAdjustmentPct: parseOptionalNumber(draft.annualAdjustmentPct),
    startedAt: parseOptionalDate(draft.startedAt),
    renewalAt: parseOptionalDate(draft.renewalAt),
    terminatedAt: parseOptionalDate(draft.terminatedAt),
    lastContactedAt: parseOptionalDate(draft.lastContactedAt),
    leadSource: draft.leadSource.trim() || null,
    googleDriveUrl: draft.googleDriveUrl.trim() || null,
    customerClickUpId: draft.customerClickUpId.trim() || null,
    clickUpTaskName: draft.clickUpTaskName.trim() || null,
    churnNote: draft.churnNote.trim() || null,
    churnReason: draft.churnReason,
    tags,
    servicesActive: draft.servicesActive,
    hoursBudget: parseOptionalNumber(draft.hoursBudget),
    monthlyProfitMargin: parseOptionalNumber(draft.monthlyProfitMargin),
    npsInterval: draft.npsInterval || null,
    allocation,
    deptAssignees,
    primaryContact: embedContact("primaryContact"),
    secondaryContact: embedContact("secondaryContact"),
  };
}
