import mongoose from "mongoose";

import {
  buildFallbackContractServices,
  normalizeServiceBilling,
  SERVICE_BILLING_TYPES,
} from "@/lib/contracts/contract-services";
import ContractService from "@/lib/db/models/contract-service";
import Department from "@/lib/db/models/department";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @typedef {Record<string, unknown>} RawDoc */

/** @param {RawDoc} doc */
function mapService(doc) {
  const amount = Number(doc.defaultAmount);
  return {
    id: doc._id != null ? String(doc._id) : "",
    key: String(doc.key ?? ""),
    name: String(doc.name ?? ""),
    billing: normalizeServiceBilling(doc.billing),
    departmentKey: typeof doc.departmentKey === "string" ? doc.departmentKey : "",
    defaultAmount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    active: doc.active !== false,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
  };
}

/** @typedef {ReturnType<typeof mapService>} ContractServiceRow */

/** @param {unknown} raw */
function normalizeKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** @param {unknown} raw */
function parseAmount(raw) {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** @param {RawDoc} scope */
async function loadDepartments(scope) {
  const docs = await Department.find(/** @type {RawDoc} */ (scope))
    .select("key name")
    .sort({ name: 1 })
    .lean();
  return (Array.isArray(docs) ? docs : []).map((d) => ({
    key: String(d.key),
    name: String(d.name ?? d.key),
  }));
}

/**
 * Kataloget fra databasen — eller standardlisten (afdelinger + Web engangs), hvis det er tomt.
 * @param {{ includeTest?: boolean; includeInactive?: boolean }} [opts]
 * @returns {Promise<{ services: ContractServiceRow[]; isFallback: boolean }>}
 */
export async function listContractServices(opts = {}) {
  await connectDb();
  const docs = await ContractService.find({}).sort({ sortOrder: 1, name: 1 }).lean();
  const rows = (Array.isArray(docs) ? docs : []).map((d) => mapService(/** @type {RawDoc} */ (d)));
  if (rows.length) {
    return {
      services: opts.includeInactive ? rows : rows.filter((s) => s.active),
      isFallback: false,
    };
  }
  const scope = buildIsTestQuery(opts.includeTest ? "all" : "production");
  const departments = await loadDepartments(/** @type {RawDoc} */ (scope));
  return {
    services: buildFallbackContractServices(departments).map((s, i) => ({
      id: "",
      key: s.key,
      name: s.name,
      billing: s.billing,
      departmentKey: s.departmentKey ?? "",
      defaultAmount: undefined,
      active: true,
      sortOrder: i * 10,
    })),
    isFallback: true,
  };
}

/**
 * Gemmer standardlisten i databasen, så admins kan redigere den (no-op hvis kataloget findes).
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function seedContractServices(opts = {}) {
  await connectDb();
  if (await ContractService.exists({})) return { seeded: 0 };
  const { services } = await listContractServices(opts);
  if (!services.length) return { seeded: 0 };
  await ContractService.insertMany(
    services.map((s) => ({
      key: s.key,
      name: s.name,
      billing: s.billing,
      departmentKey: s.departmentKey || undefined,
      active: true,
      sortOrder: s.sortOrder,
    })),
    { ordered: false },
  );
  return { seeded: services.length };
}

/**
 * Aktive services pr. nøgle — bruges når en kontrakt sendes.
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function loadContractServiceMap(opts = {}) {
  const { services } = await listContractServices(opts);
  return new Map(services.map((s) => [s.key, s]));
}

/**
 * @param {{
 *   key?: string;
 *   name: string;
 *   billing?: string;
 *   departmentKey?: string;
 *   defaultAmount?: unknown;
 *   sortOrder?: number;
 *   includeTest?: boolean;
 * }} input
 */
export async function createContractService(input) {
  await connectDb();
  const name = String(input.name ?? "").trim();
  if (!name) return { error: "Mangler navn", status: 400 };
  const key = normalizeKey(input.key) || normalizeKey(name);
  if (!key) return { error: "Mangler nøgle", status: 400 };
  if (input.billing && !SERVICE_BILLING_TYPES.includes(/** @type {never} */ (input.billing))) {
    return { error: "Ugyldig faktureringstype", status: 400 };
  }

  // Første ændring: gem standardlisten, så den ikke forsvinder når kataloget ikke længere er tomt.
  await seedContractServices({ includeTest: input.includeTest });

  if (await ContractService.exists({ key })) return { error: "Nøglen findes allerede", status: 409 };

  let sortOrder = input.sortOrder;
  if (typeof sortOrder !== "number" || !Number.isFinite(sortOrder)) {
    const last = await ContractService.findOne({}).sort({ sortOrder: -1 }).select("sortOrder").lean();
    sortOrder = (typeof last?.sortOrder === "number" ? last.sortOrder : 0) + 10;
  }

  const doc = await ContractService.create({
    key,
    name,
    billing: normalizeServiceBilling(input.billing),
    departmentKey: String(input.departmentKey ?? "").trim() || undefined,
    defaultAmount: parseAmount(input.defaultAmount),
    active: true,
    sortOrder,
  });
  return { service: mapService(/** @type {RawDoc} */ (doc.toObject())) };
}

/**
 * Nøglen kan ikke ændres — den er gemt på sendte kontrakter.
 * @param {{ serviceId: string; patch: Record<string, unknown> }} input
 */
export async function updateContractService(input) {
  await connectDb();
  const id = String(input.serviceId ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Ugyldigt id", status: 400 };
  const doc = await ContractService.findById(id);
  if (!doc) return { error: "Ikke fundet", status: 404 };

  const patch = input.patch ?? {};
  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) return { error: "Mangler navn", status: 400 };
    doc.name = name;
  }
  if (typeof patch.billing === "string") {
    if (!SERVICE_BILLING_TYPES.includes(/** @type {never} */ (patch.billing))) {
      return { error: "Ugyldig faktureringstype", status: 400 };
    }
    doc.billing = patch.billing;
  }
  if (typeof patch.departmentKey === "string") {
    doc.departmentKey = patch.departmentKey.trim() || undefined;
  }
  if ("defaultAmount" in patch) doc.defaultAmount = parseAmount(patch.defaultAmount);
  if (typeof patch.active === "boolean") doc.active = patch.active;
  if (typeof patch.sortOrder === "number" && Number.isFinite(patch.sortOrder)) {
    doc.sortOrder = patch.sortOrder;
  }

  await doc.save();
  return { service: mapService(/** @type {RawDoc} */ (doc.toObject())) };
}

/** @param {{ serviceId: string }} input */
export async function deleteContractService(input) {
  await connectDb();
  const id = String(input.serviceId ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Ugyldigt id", status: 400 };
  const res = await ContractService.deleteOne({ _id: id });
  if (!res.deletedCount) return { error: "Ikke fundet", status: 404 };
  return { ok: true };
}
