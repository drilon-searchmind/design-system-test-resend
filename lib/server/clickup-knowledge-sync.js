import { fetchClickUpKnowledgePages } from "@/lib/clickup/fetch-knowledge-pages";
import {
  mapClickUpPageToArticle,
  shouldImportClickUpWikiPage,
} from "@/lib/clickup/import-knowledge-wiki";
import KnowledgeArticle from "@/lib/db/models/knowledge-article";
import { connectDb } from "@/lib/db/mongoose";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";
import {
  classifySyncRow,
  countSyncKinds,
  snapshotFields,
} from "@/lib/server/clickup-sync-utils";

const COMPARE_FIELDS = [
  "title",
  "slug",
  "sectionId",
  "summary",
  "bodyLength",
  "parentSlug",
  "sortOrder",
  "published",
  "featured",
  "readingMinutes",
];

/**
 * @param {ReturnType<typeof mapClickUpPageToArticle>} article
 */
function articleSnapshot(article) {
  return snapshotFields(
    {
      title: article.title,
      slug: article.slug,
      sectionId: article.sectionId,
      summary: article.summary,
      bodyLength: String(article.bodyMd?.length ?? 0),
      parentSlug: article.parentSlug ?? "",
      sortOrder: article.sortOrder,
      published: article.published,
      featured: article.featured,
      readingMinutes: article.readingMinutes,
    },
    COMPARE_FIELDS,
  );
}

/**
 * @param {Record<string, unknown>} doc
 */
function existingArticleSnapshot(doc) {
  return snapshotFields(
    {
      title: doc.title,
      slug: doc.slug,
      sectionId: doc.sectionId,
      summary: doc.summary,
      bodyLength: String(typeof doc.bodyMd === "string" ? doc.bodyMd.length : 0),
      parentSlug: doc.parentSlug ?? "",
      sortOrder: doc.sortOrder,
      published: doc.published,
      featured: doc.featured,
      readingMinutes: doc.readingMinutes,
    },
    COMPARE_FIELDS,
  );
}

/**
 * @param {Record<string, unknown>[]} pages
 */
function mapImportableArticles(pages) {
  const filtered = pages.filter((p) => shouldImportClickUpWikiPage(p));
  /** @type {ReturnType<typeof mapClickUpPageToArticle>[]} */
  const mapped = [];
  /** @type {Map<string, string>} */
  const slugByClickUpId = new Map();

  for (const page of filtered) {
    const article = mapClickUpPageToArticle(page, slugByClickUpId);
    if (page.id) slugByClickUpId.set(String(page.id), article.slug);
    mapped.push({ page, article });
  }

  for (let i = 0; i < mapped.length; i += 1) {
    const src = /** @type {Record<string, unknown>} */ (mapped[i].page);
    const parentId = typeof src.parent_page_id === "string" ? src.parent_page_id : "";
    if (parentId) mapped[i].article.parentSlug = slugByClickUpId.get(parentId) ?? null;
  }

  return { filtered, mapped, excluded: pages.length - filtered.length };
}

export async function previewClickUpKnowledgeSync() {
  const { pages, docId, docName, pageCount } = await fetchClickUpKnowledgePages();
  await connectDb();

  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));
  const existingDocs = await KnowledgeArticle.find({
    ...scope,
    clickupPageId: { $exists: true, $ne: null },
  })
    .select(["clickupPageId", ...COMPARE_FIELDS, "bodyMd"].join(" "))
    .lean();

  /** @type {Map<string, Record<string, unknown>>} */
  const existingByPageId = new Map();
  for (const doc of existingDocs) {
    const id = String(doc.clickupPageId ?? "").trim();
    if (id) existingByPageId.set(id, /** @type {Record<string, unknown>} */ (doc));
  }

  const { mapped, excluded } = mapImportableArticles(pages);

  /** @type {Array<ReturnType<typeof classifySyncRow>>} */
  const previewRows = [];

  for (const { page, article } of mapped) {
    const clickupPageId = String(article.clickupPageId ?? page.id ?? "").trim();
    const proposed = articleSnapshot(article);
    const existing = existingByPageId.get(clickupPageId);
    const current = existing ? existingArticleSnapshot(existing) : null;

    previewRows.push(
      classifySyncRow({
        id: clickupPageId,
        linkUrl: typeof page.clickup_url === "string" ? page.clickup_url : "",
        proposed,
        current,
        compareFields: COMPARE_FIELDS,
        skipped: !clickupPageId,
      }),
    );
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceLabel: `${docName} (${docId})`,
    docId,
    total: pageCount,
    importable: mapped.length,
    excluded,
    counts: countSyncKinds(previewRows),
    rows: previewRows,
    slowFetchNote:
      "Vidensbase-preview henter alle sider fra ClickUp (ca. 1 request/sek) — det kan tage flere minutter.",
  };
}

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {string[]} clickupPageIds
 */
export async function applyClickUpKnowledgeSync(clickupPageIds) {
  const ids = [...new Set(clickupPageIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (!ids.length) {
    return { ok: false, error: "Ingen artikler valgt", status: 400 };
  }

  const { pages, docId } = await fetchClickUpKnowledgePages();
  const idSet = new Set(ids);
  const { mapped } = mapImportableArticles(pages);
  const selected = mapped.filter(({ article }) => idSet.has(String(article.clickupPageId ?? "")));

  if (!selected.length) {
    return { ok: false, error: "Valgte artikler findes ikke i ClickUp-preview", status: 400 };
  }

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (buildIsTestQuery("production"));

  let imported = 0;
  let skipped = 0;
  /** @type {string[]} */
  const errors = [];

  for (const { article } of selected) {
    try {
      const existing = await KnowledgeArticle.findOne(
        /** @type {Record<string, unknown>} */ (
          andQuery(scope, { clickupPageId: article.clickupPageId })
        ),
      );

      if (existing) {
        existing.title = article.title;
        existing.summary = article.summary;
        existing.bodyMd = article.bodyMd;
        existing.sectionId = article.sectionId;
        existing.parentSlug = article.parentSlug;
        existing.sortOrder = article.sortOrder;
        existing.icon = article.icon;
        existing.tags = article.tags;
        existing.readingMinutes = article.readingMinutes;
        existing.featured = article.featured;
        existing.published = article.published;
        await existing.save();
      } else {
        await KnowledgeArticle.create({
          ...article,
          isTest: false,
        });
      }
      imported += 1;
    } catch (e) {
      skipped += 1;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${article.clickupPageId}: ${msg}`);
    }
  }

  return {
    ok: true,
    imported,
    skipped,
    errors,
    total: selected.length,
    docId,
    appliedIds: ids,
  };
}
