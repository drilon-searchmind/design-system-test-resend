import {
  csvRowToClientDoc,
  fetchClickUpCustomerRows,
} from "@/lib/clickup/import-customers";
import Client from "@/lib/db/models/client";
import { connectDb } from "@/lib/db/mongoose";

/** @typedef {'new' | 'update' | 'unchanged' | 'skipped'} SyncKind */

/** @type {Array<keyof ReturnType<typeof clientSnapshot>>} */
const COMPARE_FIELDS = [
  "name",
  "slug",
  "status",
  "cvr",
  "retainerAmount",
  "marketingStartMrr",
  "marketingUpsellMrr",
  "agreementType",
  "industry",
  "leadSource",
  "googleDriveUrl",
  "clickUpTaskName",
  "churnNote",
  "annualAdjustmentPct",
  "servicesActive",
  "churnReason",
  "startedAt",
  "renewalAt",
  "terminatedAt",
];

/**
 * @param {unknown} value
 */
function normalizeCompareValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(String).sort().join("|");
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value).trim();
}

/**
 * @param {Record<string, unknown>} doc
 */
function clientSnapshot(doc) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of COMPARE_FIELDS) {
    out[key] = normalizeCompareValue(doc[key]);
  }
  return out;
}

/**
 * @param {Record<string, string>} current
 * @param {Record<string, string>} proposed
 */
function diffSnapshots(current, proposed) {
  /** @type {Array<{ field: string; from: string; to: string }>} */
  const changes = [];
  for (const key of COMPARE_FIELDS) {
    const from = current[key] ?? "";
    const to = proposed[key] ?? "";
    if (from !== to) changes.push({ field: key, from, to });
  }
  return changes;
}

/**
 * @param {Record<string, string>} row
 * @param {Set<string>} usedSlugs
 * @param {Map<string, Record<string, unknown>>} existingByClickUpId
 */
function proposedClientDoc(row, usedSlugs, existingByClickUpId) {
  const doc = csvRowToClientDoc(row, usedSlugs);
  if (!doc) return null;

  const clickUpId = String(doc.customerClickUpId ?? "");
  const existing = existingByClickUpId.get(clickUpId);
  if (existing && typeof existing.slug === "string" && existing.slug.trim()) {
    doc.slug = String(existing.slug).trim();
  }

  return doc;
}

/**
 * @param {Record<string, string>[]} rows
 * @param {Map<string, Record<string, unknown>>} existingByClickUpId
 */
function buildPreviewRows(rows, existingByClickUpId) {
  /** @type {Set<string>} */
  const usedSlugs = new Set();
  for (const client of existingByClickUpId.values()) {
    if (client.slug) usedSlugs.add(String(client.slug));
  }

  /** @type {Array<{
   *   customerClickUpId: string;
   *   kind: SyncKind;
   *   clickUpUrl: string;
   *   proposed: Record<string, string> | null;
   *   current: Record<string, string> | null;
   *   changes: Array<{ field: string; from: string; to: string }>;
   * }>} */
  const previewRows = [];

  let counts = { new: 0, update: 0, unchanged: 0, skipped: 0 };

  for (const row of rows) {
    const clickUpId = String(row.customerClickUpId ?? "").trim();
    if (!clickUpId) {
      counts.skipped += 1;
      previewRows.push({
        customerClickUpId: "",
        kind: "skipped",
        clickUpUrl: String(row.clickUpUrl ?? ""),
        proposed: null,
        current: null,
        changes: [],
      });
      continue;
    }

    const doc = proposedClientDoc(row, usedSlugs, existingByClickUpId);
    if (!doc) {
      counts.skipped += 1;
      previewRows.push({
        customerClickUpId: clickUpId,
        kind: "skipped",
        clickUpUrl: String(row.clickUpUrl ?? ""),
        proposed: null,
        current: null,
        changes: [],
      });
      continue;
    }

    const proposed = clientSnapshot(doc);
    const existing = existingByClickUpId.get(clickUpId);
    const current = existing ? clientSnapshot(existing) : null;

    if (!current) {
      counts.new += 1;
      previewRows.push({
        customerClickUpId: clickUpId,
        kind: "new",
        clickUpUrl: String(row.clickUpUrl ?? ""),
        proposed,
        current: null,
        changes: [],
      });
      continue;
    }

    const changes = diffSnapshots(current, proposed);
    if (!changes.length) {
      counts.unchanged += 1;
      previewRows.push({
        customerClickUpId: clickUpId,
        kind: "unchanged",
        clickUpUrl: String(row.clickUpUrl ?? ""),
        proposed,
        current,
        changes: [],
      });
      continue;
    }

    counts.update += 1;
    previewRows.push({
      customerClickUpId: clickUpId,
      kind: "update",
      clickUpUrl: String(row.clickUpUrl ?? ""),
      proposed,
      current,
      changes,
    });
  }

  return { previewRows, counts };
}

export async function previewClickUpCustomersSync() {
  const { rows, viewId } = await fetchClickUpCustomerRows();
  await connectDb();

  const existingDocs = await Client.find({
    customerClickUpId: { $exists: true, $ne: null },
  })
    .select(["customerClickUpId", ...COMPARE_FIELDS].join(" "))
    .lean();

  /** @type {Map<string, Record<string, unknown>>} */
  const existingByClickUpId = new Map();
  for (const doc of existingDocs) {
    const id = String(doc.customerClickUpId ?? "").trim();
    if (id) existingByClickUpId.set(id, /** @type {Record<string, unknown>} */ (doc));
  }

  const { previewRows, counts } = buildPreviewRows(rows, existingByClickUpId);

  return {
    fetchedAt: new Date().toISOString(),
    viewId,
    total: rows.length,
    counts,
    rows: previewRows,
  };
}

/**
 * @param {string[]} customerClickUpIds
 */
export async function applyClickUpCustomersSync(customerClickUpIds) {
  const ids = [...new Set(customerClickUpIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (!ids.length) {
    return { ok: false, error: "Ingen kunder valgt", status: 400 };
  }

  const { rows, viewId } = await fetchClickUpCustomerRows();
  const idSet = new Set(ids);
  const selectedRows = rows.filter((row) => idSet.has(String(row.customerClickUpId ?? "").trim()));
  if (!selectedRows.length) {
    return { ok: false, error: "Valgte kunder findes ikke i ClickUp-preview", status: 400 };
  }

  await connectDb();

  const existingDocs = await Client.find({
    customerClickUpId: { $exists: true, $ne: null },
  })
    .select(["customerClickUpId", "slug", ...COMPARE_FIELDS].join(" "))
    .lean();

  /** @type {Map<string, Record<string, unknown>>} */
  const existingByClickUpId = new Map();
  /** @type {Set<string>} */
  const usedSlugs = new Set();
  for (const doc of existingDocs) {
    const id = String(doc.customerClickUpId ?? "").trim();
    if (id) existingByClickUpId.set(id, /** @type {Record<string, unknown>} */ (doc));
    if (doc.slug) usedSlugs.add(String(doc.slug));
  }

  let imported = 0;
  let skipped = 0;
  /** @type {string[]} */
  const errors = [];

  for (const row of selectedRows) {
    const doc = proposedClientDoc(row, usedSlugs, existingByClickUpId);
    if (!doc) {
      skipped += 1;
      continue;
    }

    try {
      await Client.findOneAndUpdate({ customerClickUpId: doc.customerClickUpId }, doc, {
        upsert: true,
        setDefaultsOnInsert: true,
      });
      imported += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${doc.customerClickUpId}: ${msg}`);
    }
  }

  return {
    ok: true,
    imported,
    skipped,
    errors,
    total: selectedRows.length,
    viewId,
    appliedIds: ids,
  };
}
