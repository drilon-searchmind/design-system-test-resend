import mongoose from "mongoose";

import { validateUpsellInput } from "@/lib/crm/upsell-utils";
import Client from "@/lib/db/models/client";
import Upsell from "@/lib/db/models/upsell";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {unknown} d */
function isoDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/**
 * @param {Record<string, any>} doc
 * @param {{ slug?: string; name?: string }} [client]
 * @returns {import("@/lib/crm/upsell-utils").UpsellItem}
 */
export function mapUpsellDoc(doc, client = {}) {
  return {
    id: String(doc._id),
    type: doc.type,
    amount: Number(doc.amount) || 0,
    currency: String(doc.currency ?? "DKK"),
    periodFrom: String(doc.periodFrom),
    periodTo: String(doc.periodTo),
    soldBy: String(doc.soldBy ?? ""),
    ...(doc.soldByKey ? { soldByKey: String(doc.soldByKey) } : {}),
    soldAt: isoDate(doc.soldAt),
    ...(doc.department ? { department: String(doc.department) } : {}),
    description: String(doc.description ?? ""),
    ...(client.slug ? { clientId: client.slug } : {}),
    ...(client.name ? { clientName: client.name } : {}),
  };
}

/**
 * Alle opsalg for de givne kunder, grupperet pr. kunde-id (nyeste salg først).
 * @param {import("mongoose").Types.ObjectId[]} clientObjectIds
 * @returns {Promise<Record<string, import("@/lib/crm/upsell-utils").UpsellItem[]>>}
 */
export async function fetchUpsellsByClientId(clientObjectIds) {
  if (!clientObjectIds.length) return {};
  const docs = await Upsell.find({ clientId: { $in: clientObjectIds } })
    .sort({ soldAt: -1, createdAt: -1 })
    .lean();
  /** @type {Record<string, import("@/lib/crm/upsell-utils").UpsellItem[]>} */
  const out = {};
  for (const d of docs) {
    const key = String(d.clientId);
    (out[key] ??= []).push(mapUpsellDoc(d));
  }
  return out;
}

/**
 * @param {string} clientKey slug eller ObjectId
 * @param {boolean} includeTest
 */
async function findClient(clientKey, includeTest) {
  const key = clientKey.trim();
  /** @type {Record<string, unknown>[]} */
  const or = [{ slug: key }];
  if (mongoose.Types.ObjectId.isValid(key)) or.push({ _id: new mongoose.Types.ObjectId(key) });
  const scope = buildIsTestQuery(includeTest ? "all" : "production");
  return Client.findOne({ $and: [{ $or: or }, scope] }).lean();
}

/**
 * Opret opsalg. Fast MRR-stigning lægges på kundens MRR (og afdelingsbudget hvis sat) og logges.
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {Record<string, unknown>} raw
 * @param {{ by?: string }} [meta]
 */
export async function createUpsell(clientKey, includeTest, raw, meta = {}) {
  const parsed = validateUpsellInput(raw);
  if ("error" in parsed) return { error: parsed.error, status: 400 };
  const v = parsed.value;

  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };

  const doc = await Upsell.create({
    clientId: client._id,
    clientSlug: client.slug,
    type: v.type,
    amount: v.amount,
    currency: client.currency ?? "DKK",
    periodFrom: v.periodFrom,
    periodTo: v.periodTo,
    soldBy: v.soldBy,
    soldByKey: v.soldByKey,
    soldAt: new Date(`${v.soldAt}T12:00:00`),
    department: v.department,
    description: v.description,
    createdBy: meta.by ?? "",
    isTest: Boolean(client.isTest),
  });

  if (v.type === "mrr_increase") {
    const from = typeof client.retainerAmount === "number" ? client.retainerAmount : 0;
    /** @type {Record<string, unknown>} */
    const update = {
      $inc: { retainerAmount: v.amount },
      $push: {
        commercialLog: {
          $each: [
            {
              at: new Date(),
              by: meta.by ?? v.soldBy,
              note: `Opsalg: ${v.description}`.slice(0, 500),
              changes: { retainerAmount: { from, to: from + v.amount } },
            },
          ],
          $slice: -50,
        },
      },
    };
    const budgets =
      client.serviceBudgets instanceof Map ?
        Object.fromEntries(client.serviceBudgets)
      : (client.serviceBudgets ?? {});
    const hasBudgets = Object.values(budgets).some((n) => Number(n) > 0);
    if (v.department && hasBudgets) {
      /** @type {Record<string, number>} */ (update.$inc)[`serviceBudgets.${v.department}`] = v.amount;
    }
    await Client.updateOne({ _id: client._id }, update).exec();
  }

  return {
    ok: /** @type {const} */ (true),
    upsell: mapUpsellDoc(doc.toObject(), { slug: String(client.slug ?? ""), name: String(client.name ?? "") }),
  };
}

/**
 * Slet opsalg. En fast MRR-stigning rulles ikke tilbage — ret MRR under "Aftalebeløb".
 * @param {string} clientKey
 * @param {boolean} includeTest
 * @param {string} upsellId
 */
export async function deleteUpsell(clientKey, includeTest, upsellId) {
  if (!mongoose.Types.ObjectId.isValid(upsellId)) return { error: "Ugyldigt id", status: 400 };
  await connectDb();
  const client = await findClient(clientKey, includeTest);
  if (!client) return { error: "Kunden findes ikke", status: 404 };
  const res = await Upsell.deleteOne({ _id: upsellId, clientId: client._id });
  if (!res.deletedCount) return { error: "Opsalget findes ikke", status: 404 };
  return { ok: /** @type {const} */ (true) };
}