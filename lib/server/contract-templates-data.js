import mongoose from "mongoose";

import {
  DEFAULT_CONTRACT_TEMPLATE_DOCUMENT,
  DEFAULT_CONTRACT_TEMPLATE_EMAIL,
  DEFAULT_CONTRACT_TEMPLATE_SUBJECT,
} from "@/lib/crm/contract-template-defaults";
import ContractTemplate from "@/lib/db/models/contract-template";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/** @typedef {Record<string, unknown>} RawDoc */

/**
 * @param {RawDoc} doc
 */
function mapTemplate(doc) {
  return {
    id: doc._id != null ? String(doc._id) : "",
    key: String(doc.key ?? ""),
    name: String(doc.name ?? ""),
    subject: String(doc.subject ?? ""),
    emailBodyMd: String(doc.emailBodyMd ?? ""),
    documentBodyMd: String(doc.documentBodyMd ?? ""),
    defaultType: String(doc.defaultType ?? "retainer"),
    defaultNoticeDays:
      typeof doc.defaultNoticeDays === "number" && Number.isFinite(doc.defaultNoticeDays) ?
        doc.defaultNoticeDays
      : 90,
    locale: String(doc.locale ?? "da"),
    active: doc.active !== false,
    isDefault: Boolean(doc.isDefault),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
  };
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function listContractTemplates(opts = {}) {
  await connectDb();
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  const docs = await ContractTemplate.find(/** @type {RawDoc} */ (scope))
    .sort({ isDefault: -1, name: 1 })
    .lean();
  return {
    templates: (Array.isArray(docs) ? docs : []).map((d) => mapTemplate(/** @type {RawDoc} */ (d))),
  };
}

/**
 * @param {{
 *   key: string;
 *   name: string;
 *   subject: string;
 *   emailBodyMd: string;
 *   documentBodyMd: string;
 *   defaultType?: string;
 *   defaultNoticeDays?: number;
 *   isDefault?: boolean;
 *   includeTest?: boolean;
 * }} input
 */
export async function createContractTemplate(input) {
  await connectDb();
  const key = String(input.key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!key) return { error: "Mangler nøgle", status: 400 };
  if (!String(input.name ?? "").trim()) return { error: "Mangler navn", status: 400 };
  if (!String(input.subject ?? "").trim()) return { error: "Mangler e-mail-emne", status: 400 };
  if (!String(input.emailBodyMd ?? "").trim()) return { error: "Mangler e-mail-tekst", status: 400 };
  if (!String(input.documentBodyMd ?? "").trim()) {
    return { error: "Mangler kontrakttekst", status: 400 };
  }

  const scope = buildIsTestQuery(input.includeTest ? "all" : "production");
  const existing = await ContractTemplate.findOne(
    /** @type {RawDoc} */ (andQuery(scope, { key })),
  ).lean();
  if (existing) return { error: "Nøglen findes allerede", status: 409 };

  if (input.isDefault) {
    await ContractTemplate.updateMany(
      /** @type {RawDoc} */ (scope),
      { $set: { isDefault: false } },
    );
  }

  const doc = await ContractTemplate.create({
    key,
    name: String(input.name).trim(),
    subject: String(input.subject).trim(),
    emailBodyMd: String(input.emailBodyMd).trim(),
    documentBodyMd: String(input.documentBodyMd).trim(),
    defaultType: ["retainer", "project", "one_off", "subscription"].includes(
      String(input.defaultType),
    )
      ? input.defaultType
      : "retainer",
    defaultNoticeDays:
      typeof input.defaultNoticeDays === "number" && Number.isFinite(input.defaultNoticeDays) ?
        input.defaultNoticeDays
      : 90,
    isDefault: Boolean(input.isDefault),
    active: true,
    isTest: Boolean(input.includeTest),
  });

  return { template: mapTemplate(/** @type {RawDoc} */ (doc.toObject())) };
}

/**
 * @param {{
 *   templateId: string;
 *   patch: Record<string, unknown>;
 *   includeTest?: boolean;
 * }} input
 */
export async function updateContractTemplate(input) {
  await connectDb();
  const id = String(input.templateId ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Ugyldigt id", status: 400 };

  const scope = buildIsTestQuery(input.includeTest ? "all" : "production");
  const doc = await ContractTemplate.findOne(
    /** @type {RawDoc} */ (andQuery(scope, { _id: id })),
  );
  if (!doc) return { error: "Ikke fundet", status: 404 };

  const patch = input.patch ?? {};
  if (typeof patch.name === "string") doc.name = patch.name.trim();
  if (typeof patch.subject === "string") doc.subject = patch.subject.trim();
  if (typeof patch.emailBodyMd === "string") doc.emailBodyMd = patch.emailBodyMd;
  if (typeof patch.documentBodyMd === "string") doc.documentBodyMd = patch.documentBodyMd;
  if (typeof patch.active === "boolean") doc.active = patch.active;
  if (
    typeof patch.defaultType === "string" &&
    ["retainer", "project", "one_off", "subscription"].includes(patch.defaultType)
  ) {
    doc.defaultType = patch.defaultType;
  }
  if (typeof patch.defaultNoticeDays === "number" && Number.isFinite(patch.defaultNoticeDays)) {
    doc.defaultNoticeDays = patch.defaultNoticeDays;
  }
  if (patch.isDefault === true) {
    await ContractTemplate.updateMany(
      /** @type {RawDoc} */ (scope),
      { $set: { isDefault: false } },
    );
    doc.isDefault = true;
  } else if (patch.isDefault === false) {
    doc.isDefault = false;
  }

  await doc.save();
  return { template: mapTemplate(/** @type {RawDoc} */ (doc.toObject())) };
}

/**
 * @param {{ templateId: string; includeTest?: boolean }} input
 */
export async function deleteContractTemplate(input) {
  await connectDb();
  const id = String(input.templateId ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Ugyldigt id", status: 400 };
  const scope = buildIsTestQuery(input.includeTest ? "all" : "production");
  const res = await ContractTemplate.deleteOne(/** @type {RawDoc} */ (andQuery(scope, { _id: id })));
  if (!res.deletedCount) return { error: "Ikke fundet", status: 404 };
  return { ok: true };
}

/**
 * @param {RawDoc} scope
 */
export async function resolveDefaultContractTemplate(scope) {
  const def = await ContractTemplate.findOne(
    /** @type {RawDoc} */ (andQuery(scope, { active: true, isDefault: true })),
  ).lean();
  if (def && typeof def === "object") return /** @type {RawDoc} */ (def);

  const any = await ContractTemplate.findOne(
    /** @type {RawDoc} */ (andQuery(scope, { active: true })),
  )
    .sort({ name: 1 })
    .lean();
  return any && typeof any === "object" ? /** @type {RawDoc} */ (any) : null;
}

/**
 * Ensures at least one default template exists (seed on first use).
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function ensureDefaultContractTemplate(opts = {}) {
  await connectDb();
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  const existing = await resolveDefaultContractTemplate(/** @type {RawDoc} */ (scope));
  if (existing) return mapTemplate(existing);

  const doc = await ContractTemplate.create({
    key: "standard-retainer",
    name: "Standard retaineraftale",
    subject: DEFAULT_CONTRACT_TEMPLATE_SUBJECT,
    emailBodyMd: DEFAULT_CONTRACT_TEMPLATE_EMAIL,
    documentBodyMd: DEFAULT_CONTRACT_TEMPLATE_DOCUMENT,
    defaultType: "retainer",
    defaultNoticeDays: 90,
    isDefault: true,
    active: true,
    isTest: Boolean(opts.includeTest),
  });

  return mapTemplate(/** @type {RawDoc} */ (doc.toObject()));
}
