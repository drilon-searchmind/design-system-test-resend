import mongoose from "mongoose";

import ToolboxTool from "@/lib/db/models/toolbox-tool";
import { connectDb } from "@/lib/db/mongoose";

export const TOOLBOX_DEFAULT_CATEGORY = "Andet";

/** @typedef {Record<string, unknown>} RawDoc */

/** @param {RawDoc} doc */
function mapTool(doc) {
  return {
    id: String(doc._id ?? ""),
    name: String(doc.name ?? ""),
    url: String(doc.url ?? ""),
    description: String(doc.description ?? ""),
    category: String(doc.category ?? "").trim() || TOOLBOX_DEFAULT_CATEGORY,
    adminOnly: Boolean(doc.adminOnly),
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
  };
}

/** @typedef {ReturnType<typeof mapTool>} ToolboxToolRow */

/**
 * "notion.so/searchmind" → "https://notion.so/searchmind". Kun http(s).
 * @param {unknown} raw
 */
function normalizeUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return "";
    return url.toString();
  } catch {
    return "";
  }
}

/** @param {unknown} raw @param {number} max */
function text(raw, max) {
  return String(raw ?? "").trim().slice(0, max);
}

/** @param {{ includeAdminOnly?: boolean }} [opts] */
export async function listToolboxTools(opts = {}) {
  await connectDb();
  const filter = opts.includeAdminOnly ? {} : { adminOnly: { $ne: true } };
  const docs = await ToolboxTool.find(filter).sort({ category: 1, sortOrder: 1, name: 1 }).lean();
  return { tools: (Array.isArray(docs) ? docs : []).map((d) => mapTool(/** @type {RawDoc} */ (d))) };
}

/**
 * @param {{ name?: unknown; url?: unknown; description?: unknown; category?: unknown; adminOnly?: unknown; sortOrder?: unknown }} input
 */
export async function createToolboxTool(input) {
  await connectDb();
  const name = text(input.name, 80);
  if (!name) return { error: "Navn er påkrævet", status: 400 };
  const url = normalizeUrl(input.url);
  if (!url) return { error: "Angiv en gyldig URL (https://…)", status: 400 };

  const doc = await ToolboxTool.create({
    name,
    url,
    description: text(input.description, 240),
    category: text(input.category, 40),
    adminOnly: input.adminOnly === true,
    sortOrder: typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  });
  return { tool: mapTool(doc.toObject()) };
}

/**
 * @param {string} toolId
 * @param {Record<string, unknown>} patch
 */
export async function updateToolboxTool(toolId, patch) {
  await connectDb();
  if (!mongoose.isValidObjectId(toolId)) return { error: "Værktøj findes ikke", status: 404 };
  const doc = await ToolboxTool.findById(toolId);
  if (!doc) return { error: "Værktøj findes ikke", status: 404 };

  if ("name" in patch) {
    const name = text(patch.name, 80);
    if (!name) return { error: "Navn er påkrævet", status: 400 };
    doc.name = name;
  }
  if ("url" in patch) {
    const url = normalizeUrl(patch.url);
    if (!url) return { error: "Angiv en gyldig URL (https://…)", status: 400 };
    doc.url = url;
  }
  if ("description" in patch) doc.description = text(patch.description, 240);
  if ("category" in patch) doc.category = text(patch.category, 40);
  if (typeof patch.adminOnly === "boolean") doc.adminOnly = patch.adminOnly;
  if (typeof patch.sortOrder === "number" && Number.isFinite(patch.sortOrder)) doc.sortOrder = patch.sortOrder;

  await doc.save();
  return { tool: mapTool(doc.toObject()) };
}

/** @param {string} toolId */
export async function deleteToolboxTool(toolId) {
  await connectDb();
  if (!mongoose.isValidObjectId(toolId)) return { error: "Værktøj findes ikke", status: 404 };
  const result = await ToolboxTool.deleteOne({ _id: toolId });
  if (!result.deletedCount) return { error: "Værktøj findes ikke", status: 404 };
  return { ok: true };
}
