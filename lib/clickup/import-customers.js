import fs from "node:fs/promises";
import path from "node:path";

import { fetchAllViewTasks } from "@/lib/clickup/api";
import { parseCsv } from "@/lib/clickup/csv";
import { mapClickUpCustomerTask } from "@/lib/clickup/customer-map";
import Client from "@/lib/db/models/client";
import { connectDb } from "@/lib/db/mongoose";

/** @param {string | undefined} raw */
function parseOptionalNumber(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** @param {string | undefined} raw */
function parseOptionalDate(raw) {
  const s = String(raw ?? "").trim().slice(0, 10);
  if (!s) return undefined;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** @param {string | undefined} raw */
function splitList(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Collapse to active | inactive for import (paused → active).
 * @param {string | undefined} raw
 */
function normalizeClientStatus(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "inactive") return /** @type {const} */ ("inactive");
  return /** @type {const} */ ("active");
}

/** @param {string} name */
function logoInitialsFromName(name) {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 4);
  }
  return String(name).trim().slice(0, 2).toUpperCase() || "?";
}

/** @param {string} seed */
function hueFromSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * Map export CSV row → Mongo Client document fields.
 * @param {Record<string, string>} row
 * @param {Set<string>} usedSlugs
 */
export function csvRowToClientDoc(row, usedSlugs) {
  const customerClickUpId = String(row.customerClickUpId ?? "").trim();
  if (!customerClickUpId) return null;

  const name = String(row.name ?? row.clickUpTaskName ?? "").trim() || customerClickUpId;
  let slug = String(row.slug ?? "").trim();
  if (!slug) slug = `c-${customerClickUpId}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${customerClickUpId.slice(-6)}`;
  usedSlugs.add(slug);

  /** @type {Record<string, string>} */
  const deptAssignees = {};
  for (const [key, val] of Object.entries(row)) {
    if (!key.startsWith("deptAssignees.") || !String(val).trim()) continue;
    deptAssignees[key.slice("deptAssignees.".length)] = String(val).trim();
  }

  /** @type {Record<string, unknown>} */
  const doc = {
    customerClickUpId,
    clickUpTaskName: String(row.clickUpTaskName ?? "").trim() || undefined,
    slug,
    name,
    logoInitials: logoInitialsFromName(name),
    hue: hueFromSeed(customerClickUpId),
    currency: "DKK",
    status: normalizeClientStatus(row.status),
    health: normalizeClientStatus(row.status) === "inactive" ? "warn" : "ok",
    cvr: String(row.cvr ?? "").trim() || undefined,
    retainerAmount: parseOptionalNumber(row.retainerAmount),
    marketingStartMrr: parseOptionalNumber(row.marketingStartMrr),
    marketingUpsellMrr: parseOptionalNumber(row.marketingUpsellMrr),
    agreementType: String(row.agreementType ?? "").trim() || undefined,
    industry: String(row.industry ?? "").trim() || undefined,
    leadSource: String(row.leadSource ?? "").trim() || undefined,
    googleDriveUrl: String(row.googleDriveUrl ?? "").trim() || undefined,
    annualAdjustmentPct: parseOptionalNumber(row.annualAdjustmentPct),
    startedAt: parseOptionalDate(row.startedAt),
    renewalAt: parseOptionalDate(row.renewalAt),
    terminatedAt: parseOptionalDate(row.terminatedAt),
    churnNote: String(row.churnNote ?? "").trim() || undefined,
    servicesActive: splitList(row.servicesActive),
    churnReason: splitList(row.churnReason),
    npsInterval: "quarterly",
  };

  if (Object.keys(deptAssignees).length) {
    doc.deptAssignees = deptAssignees;
  }

  return doc;
}

/**
 * @param {Record<string, string>[]} rows
 * @param {{ upsert?: boolean }} [opts]
 */
export async function importClickUpCustomers(rows, opts = {}) {
  const upsert = opts.upsert !== false;
  await connectDb();

  /** @type {Set<string>} */
  const usedSlugs = new Set();
  const existing = await Client.find({}).select("slug").lean();
  for (const c of existing) {
    if (c.slug) usedSlugs.add(String(c.slug));
  }

  let imported = 0;
  let skipped = 0;
  /** @type {string[]} */
  const errors = [];

  for (const row of rows) {
    const doc = csvRowToClientDoc(row, usedSlugs);
    if (!doc) {
      skipped += 1;
      continue;
    }

    try {
      if (upsert) {
        await Client.findOneAndUpdate({ customerClickUpId: doc.customerClickUpId }, doc, {
          upsert: true,
          setDefaultsOnInsert: true,
        });
      } else {
        await Client.create(doc);
      }
      imported += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${doc.customerClickUpId}: ${msg}`);
    }
  }

  return { ok: true, imported, skipped, errors, total: rows.length };
}

/**
 * @param {string} [csvPath]
 */
export async function importClickUpCustomersFromCsv(csvPath) {
  const file =
    csvPath ??
    (await findLatestCustomerCsv(path.join(process.cwd(), "data", "clickup-export")));
  const text = await fs.readFile(file, "utf8");
  const rows = parseCsv(text);
  const result = await importClickUpCustomers(rows);
  return { ...result, source: "csv", csvPath: file };
}

/**
 * Fetch mapped customer rows from ClickUp (no DB writes).
 */
export async function fetchClickUpCustomerRows() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error("Missing CLICKUP_API_TOKEN");

  const viewId = process.env.CLICKUP_VIEW_ID ?? "kg3eh-1173392";
  const tasks = await fetchAllViewTasks({ token, viewId, includeClosed: true });
  const rows = tasks.map((task) =>
    mapClickUpCustomerTask(/** @type {Record<string, unknown>} */ (task)),
  );
  rows.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "da"));
  return { rows, viewId };
}

/**
 * Re-fetch from ClickUp API and import (bypasses CSV parsing).
 */
export async function importClickUpCustomersFromApi() {
  const { rows, viewId } = await fetchClickUpCustomerRows();
  const result = await importClickUpCustomers(rows);
  return { ...result, source: "api", viewId };
}

/** @param {string} dir */
async function findLatestCustomerCsv(dir) {
  const entries = await fs.readdir(dir);
  const csvs = entries.filter((f) => f.startsWith("customers-") && f.endsWith(".csv")).sort();
  if (!csvs.length) {
    throw new Error(`No customers-*.csv found in ${dir}. Run npm run fetch-clickup-customers first.`);
  }
  return path.join(dir, csvs[csvs.length - 1]);
}
