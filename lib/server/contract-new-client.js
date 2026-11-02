import { normalizeCvr } from "@/lib/crm/client-groups";
import Client from "@/lib/db/models/client";
import Contact from "@/lib/db/models/contact";
import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { routes } from "@/config/routes";
import { createNotification } from "@/lib/server/notifications-data";

/** @typedef {Record<string, unknown>} RawDoc */

const AGREEMENT_TYPE_DA = /** @type {Record<string, string>} */ ({
  retainer: "Løbende",
  subscription: "Løbende",
  project: "Projekt",
  one_off: "Engangs",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {unknown} raw */
function str(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * "https://www.Eksempel.dk/shop" → "eksempel.dk"
 * @param {unknown} raw
 */
export function normalizeDomain(raw) {
  const s = str(raw).toLowerCase();
  if (!s) return "";
  return s
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .trim();
}

/** @param {string} s */
function slugPart(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** @param {string} name */
function logoInitialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 4);
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** @param {string} seed */
function hueFromSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Validate + normalise the "ny kunde" block sent from the contract form.
 * @param {unknown} raw
 */
export function normalizeProspectInput(raw) {
  if (!raw || typeof raw !== "object") return { error: "Udfyld oplysninger om den nye kunde" };
  const r = /** @type {RawDoc} */ (raw);

  const name = str(r.name);
  if (name.length < 2) return { error: "Angiv kundens firmanavn" };

  const contactEmail = str(r.contactEmail).toLowerCase();
  if (!EMAIL_RE.test(contactEmail)) return { error: "Angiv en gyldig e-mail til underskriveren" };

  const contactName = str(r.contactName);
  if (contactName.length < 2) return { error: "Angiv navnet på underskriveren" };

  const cvrRaw = str(r.cvr);
  const cvr = cvrRaw ? normalizeCvr(cvrRaw) : "";
  if (cvrRaw && !cvr) return { error: "CVR skal være 8 cifre" };

  return {
    prospect: {
      name,
      cvr: cvr || undefined,
      domain: normalizeDomain(r.domain) || undefined,
      industry: str(r.industry) || undefined,
      leadSource: str(r.leadSource) || undefined,
      agreementType: str(r.agreementType) || undefined,
      ownerMemberKey: str(r.ownerMemberKey) || undefined,
      contactName,
      contactTitle: str(r.contactTitle) || undefined,
      contactEmail,
      contactPhone: str(r.contactPhone) || undefined,
    },
  };
}

/**
 * Same brand already in the CRM? (Same CVR is allowed — that simply makes a koncern.)
 * @param {{ name: string; domain?: string }} prospect
 * @param {RawDoc} scope
 */
export async function findExistingClientForProspect(prospect, scope) {
  const slug = `c-${slugPart(prospect.domain || prospect.name)}`;
  const names = [prospect.name, prospect.domain].filter(Boolean).map((v) => String(v).toLowerCase());
  const candidates = await Client.find({
    $and: [scope, { $or: [{ slug }, { clickUpTaskName: { $in: names } }] }],
  })
    .select("name slug clickUpTaskName")
    .limit(5)
    .lean();
  const hit = candidates.find(
    (c) =>
      String(c.slug) === slug ||
      names.includes(String(c.clickUpTaskName ?? "").toLowerCase()) ||
      names.includes(String(c.name ?? "").toLowerCase()),
  );
  if (hit) return hit;

  const byName = await Client.findOne({
    $and: [scope, { name: new RegExp(`^${prospect.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }],
  })
    .select("name slug clickUpTaskName")
    .lean();
  return byName ?? null;
}

/** @param {string} base */
async function uniqueClientSlug(base) {
  let slug = base;
  let n = 2;
  while (await Client.exists({ slug })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

/**
 * Create the customer for a signed prospect contract (idempotent on `contract.clientId`).
 * @param {import('mongoose').Document & RawDoc} contract
 * @param {{ signedAt: Date }} opts
 * @returns {Promise<{ client: RawDoc; created: boolean }>}
 */
export async function createClientFromProspectContract(contract, opts) {
  await connectDb();
  const p = /** @type {RawDoc} */ (contract.prospect ?? {});
  const name = str(p.name) || "Ny kunde";
  const domain = str(p.domain);

  // Someone may have created the same brand while the contract was out for signature.
  const existing = await Client.findOne({
    $or: [
      { slug: `c-${slugPart(domain || name)}` },
      ...(domain ? [{ clickUpTaskName: domain }] : []),
    ],
  }).lean();
  if (existing) return { client: /** @type {RawDoc} */ (existing), created: false };

  const slug = await uniqueClientSlug(`c-${slugPart(domain || name) || "kunde"}`);

  const ownerKey = str(p.ownerMemberKey);
  const owner = ownerKey ? await TeamMember.findOne({ key: ownerKey }).select("_id key").lean() : null;

  const contactEmail = str(p.contactEmail);
  const contact = {
    name: str(p.contactName) || undefined,
    title: str(p.contactTitle) || undefined,
    email: contactEmail || undefined,
    phone: str(p.contactPhone) || undefined,
    isPrimary: true,
  };

  const agreementType =
    str(p.agreementType) || AGREEMENT_TYPE_DA[String(contract.type ?? "retainer")] || undefined;

  const client = await Client.create({
    slug,
    name,
    logoInitials: logoInitialsFromName(name),
    hue: hueFromSeed(slug),
    currency: String(contract.currency ?? "DKK"),
    // MRR is intentionally NOT copied to retainerAmount: the signed, active contract
    // already contributes its value to the effective retainer (see retainer-utils).
    status: "active",
    health: "ok",
    industry: str(p.industry) || undefined,
    cvr: str(p.cvr) || undefined,
    clickUpTaskName: domain || undefined,
    leadSource: str(p.leadSource) || "Kontrakt",
    agreementType,
    startedAt: contract.startDate ?? opts.signedAt,
    renewalAt: contract.renewalDate ?? undefined,
    servicesActive: Array.isArray(contract.servicesActive) ? contract.servicesActive.map(String) : [],
    ownerMemberKey: owner ? String(owner.key) : undefined,
    ownerId: owner?._id,
    primaryContact: contact.name || contact.email ? contact : undefined,
    npsInterval: "quarterly",
    lastActivityLabel: "Underskrev kontrakt",
    isTest: Boolean(contract.isTest),
  });

  if (contactEmail) {
    await Contact.create({
      clientId: client._id,
      name: contact.name ?? contactEmail,
      title: contact.title,
      email: contactEmail,
      phone: contact.phone,
      isPrimary: true,
      isTest: Boolean(contract.isTest),
    });
  }

  return { client: /** @type {RawDoc} */ (client.toObject()), created: true };
}

/**
 * Tell every user that a contract was accepted and the customer now exists.
 * @param {{
 *   clientName: string;
 *   clientSlug: string;
 *   contractLabel: string;
 *   signerName: string;
 *   clientCreated: boolean;
 *   isTest?: boolean;
 * }} input
 */
export async function notifyUsersContractSigned(input) {
  await connectDb();
  const users = await User.find({}).select("_id").lean();
  if (!users.length) return 0;

  const title = input.clientCreated ?
      `${input.clientName} er oprettet som kunde`
    : `${input.clientName} har underskrevet en kontrakt`;
  const body = input.clientCreated ?
      `${input.signerName} har accepteret «${input.contractLabel}» — ${input.clientName} er nu oprettet som kunde.`
    : `${input.signerName} har accepteret «${input.contractLabel}».`;

  const results = await Promise.allSettled(
    users.map((u) =>
      createNotification({
        userId: u._id,
        type: "contract_signed",
        title,
        body,
        href: `${routes.clients}/${input.clientSlug}`,
        actorDisplayName: input.signerName,
        contextTitle: input.contractLabel,
        isTest: input.isTest,
      }),
    ),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}
