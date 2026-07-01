/** Client field helpers — ClickUp migration mapping. */

/** @typedef {'pris' | 'konkurrent' | 'intern_beslutning' | 'servicekvalitet' | 'okonomi' | 'andet'} ChurnReason */
/** @typedef {'outbound' | 'inbound' | 'event' | 'partner' | 'referal' | 'andet'} LeadSource */

/** @type {Record<ChurnReason, string>} */
export const CHURN_REASON_LABELS = {
  pris: "Pris",
  konkurrent: "Konkurrent",
  intern_beslutning: "Intern beslutning",
  servicekvalitet: "Servicekvalitet",
  okonomi: "Økonomi",
  andet: "Andet",
};

/** @type {ChurnReason[]} */
export const CHURN_REASONS = [
  "pris",
  "konkurrent",
  "intern_beslutning",
  "servicekvalitet",
  "okonomi",
  "andet",
];

/** @type {Record<LeadSource, string>} */
export const LEAD_SOURCE_LABELS = {
  outbound: "Outbound",
  inbound: "Inbound",
  event: "Event",
  partner: "Partner",
  referal: "Henvisning",
  andet: "Andet",
};

/** @type {LeadSource[]} */
export const LEAD_SOURCES = ["outbound", "inbound", "event", "partner", "referal", "andet"];

/** Default team member per delivery department (deterministic demo picks). */
const DEPT_ASSIGNEE_DEFAULTS = {
  seo: "as",
  ppc: "lm",
  social: "jl",
  email: "kh",
  geo: "tp",
  creative: "rn",
  content: "es",
};

/** Per-client demo overrides for CVR, lead source, and optional dept assignees. */
const CLIENT_DEMO_META = {
  "c-nordvig": { cvr: "38124567", leadSource: "referal" },
  "c-vaerft": { cvr: "29485731", leadSource: "inbound" },
  "c-folio": { cvr: "55671234", leadSource: "outbound" },
  "c-brygg": { cvr: "41239876", leadSource: "event" },
  "c-torv": { cvr: "88765432", leadSource: "partner" },
  "c-axel": { cvr: "33901245", leadSource: "inbound" },
  "c-kyst": { cvr: "66781290", leadSource: "outbound" },
  "c-helio": { cvr: "22345678", leadSource: "referal" },
  "c-norden": { cvr: "99887766", leadSource: "partner" },
  "c-blaa": { cvr: "10456789", leadSource: "event" },
  "c-edge": { cvr: "77654321", leadSource: "outbound" },
  "c-matr": { cvr: "34567890", leadSource: "referal" },
  "c-lava": { cvr: "61234567", leadSource: "inbound" },
  "c-polar": { cvr: "45890123", leadSource: "outbound" },
  "c-sund": { cvr: "78901234", leadSource: "partner" },
  "c-hof": { cvr: "23456701", leadSource: "inbound" },
  "c-kerne": { cvr: "56789012", leadSource: "referal" },
  "c-vind": { cvr: "89012345", leadSource: "event" },
};

/**
 * @param {{
 *   startedAt: string;
 *   terminatedAt?: string | null;
 *   retainer: number;
 * }} client
 */
export function computeLifetimeMonths(client) {
  const startDate = new Date(client.startedAt);
  const endDate = client.terminatedAt ? new Date(client.terminatedAt) : new Date();
  return Math.max(
    0,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()),
  );
}

/**
 * Customer lifetime value — måneder × retainer.
 * @param {{
 *   startedAt: string;
 *   terminatedAt?: string | null;
 *   retainer: number;
 * }} client
 */
export function computeClv(client) {
  return Math.round(computeLifetimeMonths(client) * client.retainer);
}

/**
 * @param {{
 *   servicesActive?: string[];
 *   owner: string;
 *   deptAssignees?: Partial<Record<string, string | null>>;
 * }} client
 */
export function buildDeptAssignees(client) {
  const services = client.servicesActive ?? [];
  const base = {
    seo: null,
    ppc: null,
    social: null,
    email: null,
    geo: null,
    creative: null,
    content: null,
  };

  for (const key of Object.keys(base)) {
    if (services.includes(key)) {
      base[key] = DEPT_ASSIGNEE_DEFAULTS[key] ?? null;
    }
  }

  if (client.deptAssignees) {
    for (const [k, v] of Object.entries(client.deptAssignees)) {
      if (k in base) base[k] = v;
    }
  }

  return base;
}

/**
 * @param {Record<string, unknown> | undefined | null} contact
 * @param {boolean} isPrimary
 * @param {{ id: string; lastContactedAt?: string | null }} client
 */
export function enrichContact(contact, isPrimary, client) {
  if (!contact || typeof contact !== "object") {
    return contact;
  }
  const name = typeof contact.name === "string" ? contact.name : "";
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
  const fallbackLast = client.lastContactedAt ?? "2026-04-01";
  return {
    ...contact,
    isPrimary,
    lastContactedAt:
      typeof contact.lastContactedAt === "string" ? contact.lastContactedAt : fallbackLast,
    linkedinUrl:
      typeof contact.linkedinUrl === "string"
        ? contact.linkedinUrl
        : slug
          ? `https://www.linkedin.com/in/${slug}`
          : null,
  };
}

/**
 * Applies ClickUp-mapped client fields for demo / static data.
 * @param {Record<string, unknown>} raw
 */
export function applyClientClickupFields(raw) {
  const id = String(raw.id);
  const meta = CLIENT_DEMO_META[id] ?? { cvr: "12345678", leadSource: "andet" };
  const status = raw.status;
  const isInactive = status === "inactive";
  const isPaused = status === "paused";
  const annualAdjustmentPct = isInactive || isPaused ? 0 : 3;

  const terminatedAt = isInactive
    ? typeof raw.terminatedAt === "string"
      ? raw.terminatedAt
      : id === "c-blaa"
        ? "2025-11-15"
        : null
    : null;

  const churnReason =
    isInactive && id === "c-blaa"
      ? /** @type {ChurnReason[]} */ (["okonomi", "intern_beslutning"])
      : [];

  const churnNote =
    isInactive && id === "c-blaa"
      ? "Budgetnedskæringer i kommunikationsafdelingen — aftalen udløb efter intern prioritering."
      : null;

  const lastContactedAt =
    typeof raw.lastContactedAt === "string"
      ? raw.lastContactedAt
      : isInactive
        ? terminatedAt ?? "2025-10-20"
        : "2026-04-28";

  const deptAssignees = buildDeptAssignees({
    servicesActive: Array.isArray(raw.servicesActive) ? raw.servicesActive : [],
    owner: String(raw.owner ?? ""),
    deptAssignees:
      raw.deptAssignees && typeof raw.deptAssignees === "object"
        ? /** @type {Partial<Record<string, string | null>>} */ (raw.deptAssignees)
        : undefined,
  });

  const primaryContact = enrichContact(
    raw.primaryContact,
    true,
    { id, lastContactedAt },
  );
  const secondaryContact = raw.secondaryContact
    ? enrichContact(raw.secondaryContact, false, { id, lastContactedAt })
    : undefined;

  const enriched = {
    ...raw,
    cvr: typeof raw.cvr === "string" ? raw.cvr : meta.cvr,
    terminatedAt,
    churnReason,
    churnNote,
    leadSource:
      typeof raw.leadSource === "string" ? raw.leadSource : meta.leadSource,
    googleDriveUrl:
      typeof raw.googleDriveUrl === "string"
        ? raw.googleDriveUrl
        : `https://drive.google.com/drive/folders/demo-${id}`,
    annualAdjustmentPct:
      typeof raw.annualAdjustmentPct === "number" ? raw.annualAdjustmentPct : annualAdjustmentPct,
    lastContactedAt,
    deptAssignees,
    primaryContact,
    secondaryContact,
  };

  enriched.clv = computeClv({
    startedAt: String(enriched.startedAt),
    terminatedAt: enriched.terminatedAt,
    retainer: Number(enriched.retainer),
  });

  return enriched;
}
