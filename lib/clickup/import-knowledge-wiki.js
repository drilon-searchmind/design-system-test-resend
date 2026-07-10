import fs from "node:fs/promises";
import path from "node:path";

import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import { estimateReadingMinutes, slugifyKnowledgeTitle } from "@/lib/crm/knowledge-utils";
import { slugifyPageName } from "@/lib/clickup/knowledge-api";
import KnowledgeArticle from "@/lib/db/models/knowledge-article";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** ClickUp root page name → wiki section id */
export const CLICKUP_ROOT_TO_SECTION = /** @type {Record<string, string>} */ ({
  "ClickUp Generelt": "clickup",
  "Client Onboarding": "onboarding",
  "Det essentielle": "essentials",
  "Det praktiske": "practical",
  "Vidensdeling": "sharing",
  "Interne procedurer": "procedures",
  "Searchmind Tech": "tech",
  Morebizz: "production",
  "Referral / Partner aftaler": "commercial",
  "AI & Tools": "tech",
  Uniqkey: "tech",
  Lederhåndbog: "leadership",
});

/** Excluded top-level ClickUp sections (sensitive or out of scope) */
export const CLICKUP_EXCLUDED_ROOTS = new Set([
  "Rabatkoder",
  "Logins",
  "Knowledge Base Overview",
]);

/** Max nesting depth under each section root (0 = section landing only) */
export const CLICKUP_MAX_RELATIVE_DEPTH = /** @type {Record<string, number>} */ ({
  leadership: 2,
  production: 1,
  essentials: 1,
  clickup: 1,
  onboarding: 1,
  practical: 1,
  procedures: 1,
  tech: 1,
  sharing: 1,
  commercial: 0,
});

/**
 * @param {string} pagePath
 */
export function clickUpRootFromPath(pagePath) {
  const parts = String(pagePath ?? "")
    .split(" / ")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0] ?? "";
}

/**
 * @param {string} pagePath
 */
export function clickUpRelativeDepth(pagePath) {
  const parts = String(pagePath ?? "")
    .split(" / ")
    .filter(Boolean);
  return Math.max(0, parts.length - 1);
}

/**
 * @param {{ path?: string; name?: string; depth?: number }} page
 */
export function shouldImportClickUpWikiPage(page) {
  const pagePath = String(page.path ?? page.name ?? "");
  const root = clickUpRootFromPath(pagePath);
  if (!root || CLICKUP_EXCLUDED_ROOTS.has(root)) return false;

  const sectionId = CLICKUP_ROOT_TO_SECTION[root];
  if (!sectionId) return false;

  const relDepth = clickUpRelativeDepth(pagePath);
  const maxDepth = CLICKUP_MAX_RELATIVE_DEPTH[sectionId] ?? 1;
  return relDepth <= maxDepth;
}

/**
 * @param {string} pagePath
 */
export function sectionIdFromClickUpPath(pagePath) {
  const root = clickUpRootFromPath(pagePath);
  return CLICKUP_ROOT_TO_SECTION[root] ?? "practical";
}

/**
 * @param {unknown} avatar
 */
export function iconFromClickUpAvatar(avatar) {
  if (!avatar || typeof avatar !== "object") return null;
  const value = /** @type {{ value?: string }} */ (avatar).value;
  if (typeof value !== "string") return null;
  const emoji = value.match(/^emoji::(.+)$/);
  if (emoji) return emoji[1];
  return null;
}

/**
 * @param {string} bodyMd
 */
export function summaryFromBody(bodyMd) {
  const plain = String(bodyMd ?? "")
    .replace(/^#+\s+/gm, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
}

/**
 * @param {Record<string, unknown>} page
 * @param {Map<string, string>} slugByClickUpId
 */
export function mapClickUpPageToArticle(page, slugByClickUpId) {
  const pagePath = String(page.path ?? page.name ?? "");
  const sectionId = sectionIdFromClickUpPath(pagePath);
  const title = String(page.name ?? "Untitled").trim();
  const baseSlug = slugifyPageName(title) || slugifyKnowledgeTitle(title);
  const clickupPageId = String(page.id ?? "");
  const slug = clickupPageId ? `${baseSlug}-${clickupPageId.replace(/[^a-z0-9-]/gi, "").slice(-8)}` : baseSlug;
  const parentId = typeof page.parent_page_id === "string" ? page.parent_page_id : "";
  const parentSlug = parentId ? slugByClickUpId.get(parentId) ?? null : null;
  const bodyMd = typeof page.content_md === "string" ? page.content_md : "";
  const relDepth = clickUpRelativeDepth(pagePath);

  return {
    slug,
    title,
    summary: summaryFromBody(bodyMd),
    bodyMd,
    sectionId,
    parentSlug,
    clickupPageId,
    sortOrder: typeof page.sort_order === "number" ? page.sort_order : relDepth * 100,
    icon: iconFromClickUpAvatar(page.avatar),
    tags: parentSlug ? [] : [`section:${sectionId}`],
    audience: "internal",
    authorMemberKey: "lm",
    readingMinutes: estimateReadingMinutes(bodyMd),
    featured: relDepth === 0 && ["clickup", "onboarding", "practical"].includes(sectionId),
    published: true,
  };
}

/**
 * @param {{
 *   exportDir?: string;
 *   replaceExisting?: boolean;
 *   includeTest?: boolean;
 * }} [opts]
 */
export async function importClickUpKnowledgeWiki(opts = {}) {
  await connectDb();
  const exportDir = opts.exportDir ?? path.join(process.cwd(), "data", "clickup-export-knowledge");
  const pagesPath = path.join(exportDir, "knowledge-base-pages.json");
  const raw = await fs.readFile(pagesPath, "utf8");
  const pages = JSON.parse(raw);
  if (!Array.isArray(pages)) throw new Error("Invalid knowledge-base-pages.json");

  const filtered = pages.filter((p) => shouldImportClickUpWikiPage(/** @type {Record<string, unknown>} */ (p)));

  /** @type {ReturnType<typeof mapClickUpPageToArticle>[]} */
  const mapped = [];
  /** @type {Map<string, string>} */
  const slugByClickUpId = new Map();

  for (let i = 0; i < filtered.length; i += 1) {
    const row = /** @type {Record<string, unknown>} */ (filtered[i]);
    const article = mapClickUpPageToArticle(row, slugByClickUpId);
    if (row.id) slugByClickUpId.set(String(row.id), article.slug);
    mapped.push(article);
  }

  // Second pass to resolve parent slugs now that all slugs exist
  for (let i = 0; i < mapped.length; i += 1) {
    const src = /** @type {Record<string, unknown>} */ (filtered[i]);
    const parentId = typeof src.parent_page_id === "string" ? src.parent_page_id : "";
    if (parentId) mapped[i].parentSlug = slugByClickUpId.get(parentId) ?? null;
  }

  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));

  if (opts.replaceExisting !== false) {
    await KnowledgeArticle.deleteMany(
      /** @type {Record<string, unknown>} */ ({
        ...scope,
        clickupPageId: { $exists: true, $ne: null },
      }),
    );
  }

  let created = 0;
  let updated = 0;

  for (let i = 0; i < mapped.length; i += 1) {
    const art = mapped[i];
    const existing = await KnowledgeArticle.findOne(
      /** @type {Record<string, unknown>} */ (andQuery(scope, { clickupPageId: art.clickupPageId })),
    );

    if (existing) {
      existing.title = art.title;
      existing.summary = art.summary;
      existing.bodyMd = art.bodyMd;
      existing.sectionId = art.sectionId;
      existing.parentSlug = art.parentSlug;
      existing.sortOrder = art.sortOrder;
      existing.icon = art.icon;
      existing.tags = art.tags;
      existing.readingMinutes = art.readingMinutes;
      existing.featured = art.featured;
      existing.published = art.published;
      await existing.save();
      updated += 1;
    } else {
      await KnowledgeArticle.create({
        ...art,
        isTest: false,
      });
      created += 1;
    }
  }

  return {
    ok: true,
    exportDir,
    totalInExport: pages.length,
    imported: mapped.length,
    created,
    updated,
    skipped: pages.length - filtered.length,
    sections: KNOWLEDGE_SECTIONS.map((s) => s.id),
  };
}

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}
