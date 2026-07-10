import KnowledgeArticle from "@/lib/db/models/knowledge-article";
import TeamMember from "@/lib/db/models/team-member";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import {
  estimateReadingMinutes,
  featuredKnowledgeArticles,
  groupArticlesBySection,
  isSystemKnowledgeTag,
  kbArticleSummary,
  knowledgeStatsFromArticles,
  plainTextFromHtml,
  relatedKnowledgeArticles,
  slugifyKnowledgeTitle,
} from "@/lib/crm/knowledge-utils";
import { connectDb } from "@/lib/db/mongoose";
import { mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { enrichMembersWithUserImages } from "@/lib/server/member-user-images";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {Date | string | undefined | null} d
 */
function toIsoDateOnly(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {Record<string, unknown>} doc
 */
function serializeKnowledgeArticle(doc) {
  const updated = doc.updatedAt ? new Date(String(doc.updatedAt)) : null;
  const created = doc.createdAt ? new Date(String(doc.createdAt)) : updated;
  const bodyMd = String(doc.bodyMd ?? "");
  const summaryRaw = String(doc.summary ?? "");
  return {
    slug: String(doc.slug ?? ""),
    title: String(doc.title ?? ""),
    summary: plainTextFromHtml(summaryRaw, 500) || plainTextFromHtml(bodyMd, 160),
    bodyMd,
    sectionId: String(doc.sectionId ?? ""),
    parentSlug: typeof doc.parentSlug === "string" ? doc.parentSlug : null,
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    audience: /** @type {"internal"|"client"|"public"} */ (
      doc.audience === "client" || doc.audience === "public" ? doc.audience : "internal"
    ),
    authorId: typeof doc.authorMemberKey === "string" ? doc.authorMemberKey : "",
    createdAt: toIsoDateOnly(created) || toIsoDateOnly(new Date()),
    updatedAt: toIsoDateOnly(updated) || toIsoDateOnly(new Date()),
    published: Boolean(doc.published),
    archived: Boolean(doc.archived),
    readingMinutes: Number(doc.readingMinutes) > 0 ? Number(doc.readingMinutes) : 1,
    featured: Boolean(doc.featured),
    icon: typeof doc.icon === "string" ? doc.icon : null,
    headerImageUrl: typeof doc.headerImageUrl === "string" && doc.headerImageUrl.trim() ? doc.headerImageUrl.trim() : null,
    sortOrder: Number(doc.sortOrder) || 0,
  };
}

/**
 * @param {string[]} tags
 * @param {string} sectionId
 */
function mergeTagsWithSection(tags, sectionId) {
  const cleaned = tags.map(String).map((t) => t.trim()).filter(Boolean).filter((t) => !isSystemKnowledgeTag(t));
  return [`section:${sectionId}`, ...cleaned];
}

/**
 * @param {import("@/lib/crm/knowledge-utils").KnowledgeArticleView[]} articles
 */
async function enrichArticlesWithAuthors(articles) {
  const keys = [...new Set(articles.map((a) => a.authorId).filter(Boolean))];
  if (!keys.length) return articles.map((a) => ({ ...a, author: null }));

  const members = await TeamMember.find({ key: { $in: keys } }).lean();
  const enriched = await enrichMembersWithUserImages(
    (Array.isArray(members) ? members : []).map((m) => /** @type {Record<string, unknown>} */ (m)),
  );
  /** @type {Map<string, import("@/lib/crm/knowledge-utils").KnowledgeAuthorView>} */
  const byKey = new Map(
    enriched.map((m) => {
      const mapped = mapTeamMemberFromMongo(m);
      return [
        mapped.id,
        {
          id: mapped.id,
          name: mapped.name,
          avatar: mapped.avatar,
          hue: mapped.hue,
          image: mapped.image,
        },
      ];
    }),
  );

  return articles.map((a) => ({
    ...a,
    author: byKey.get(a.authorId) ?? null,
  }));
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchKnowledgeArticles(opts = {}) {
  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production")
  );

  const docs = await KnowledgeArticle.find(/** @type {Record<string, unknown>} */ (scope))
    .sort({ sectionId: 1, sortOrder: 1, title: 1 })
    .lean();

  const articles = (Array.isArray(docs) ? docs : []).map((d) =>
    serializeKnowledgeArticle(/** @type {Record<string, unknown>} */ (d)),
  );

  return enrichArticlesWithAuthors(articles);
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchKnowledgeBundle(opts = {}) {
  const articles = await fetchKnowledgeArticles(opts);
  const stats = knowledgeStatsFromArticles(articles);
  const bySection = groupArticlesBySection(articles);
  const featured = featuredKnowledgeArticles(articles, 3);

  return {
    sections: KNOWLEDGE_SECTIONS,
    articles,
    bySection,
    featured,
    stats,
  };
}

/**
 * @param {string} slug
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchKnowledgeArticleBySlug(slug, opts = {}) {
  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production")
  );
  const doc = await KnowledgeArticle.findOne(
    /** @type {Record<string, unknown>} */ (andQuery(scope, { slug: String(slug).trim() })),
  ).lean();
  if (!doc || typeof doc !== "object") return null;
  const article = serializeKnowledgeArticle(/** @type {Record<string, unknown>} */ (doc));
  const [enriched] = await enrichArticlesWithAuthors([article]);
  return enriched ?? null;
}

/**
 * @param {{
 *   title: string;
 *   summary?: string;
 *   bodyMd?: string;
 *   sectionId: string;
 *   parentSlug?: string | null;
 *   published?: boolean;
 *   audience?: string;
 *   authorMemberKey?: string;
 *   tags?: string[];
 *   featured?: boolean;
 *   icon?: string | null;
 *   featured?: boolean;
 *   icon?: string | null;
 *   headerImageUrl?: string | null;
 *   sortOrder?: number;
 *   includeTest?: boolean;
 * }} input
 */
export async function createKnowledgeArticle(input) {
  await connectDb();
  const title = String(input.title ?? "").trim();
  if (!title) return { error: "Titel er påkrævet", status: 400 };

  const sectionId = String(input.sectionId ?? "").trim();
  if (!sectionId || !KNOWLEDGE_SECTIONS.some((s) => s.id === sectionId)) {
    return { error: "Vælg en gyldig sektion", status: 400 };
  }

  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(input.includeTest) ? "test" : "production")
  );

  let baseSlug = slugifyKnowledgeTitle(title);
  let slug = baseSlug;
  let n = 2;
  while (await KnowledgeArticle.findOne(/** @type {Record<string, unknown>} */ (andQuery(scope, { slug })))) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const bodyMd = String(input.bodyMd ?? "").trim();
  const summaryInput = String(input.summary ?? "").trim();
  const summary = summaryInput ? plainTextFromHtml(summaryInput, 500) : plainTextFromHtml(bodyMd, 160);

  const tagsRaw = Array.isArray(input.tags) ? input.tags : [];
  const tags = mergeTagsWithSection(tagsRaw, sectionId);

  const doc = await KnowledgeArticle.create({
    slug,
    title,
    summary,
    bodyMd,
    sectionId,
    parentSlug: null,
    tags,
    audience: input.audience === "client" || input.audience === "public" ? input.audience : "internal",
    authorMemberKey: typeof input.authorMemberKey === "string" ? input.authorMemberKey : "lm",
    readingMinutes: estimateReadingMinutes(bodyMd),
    published: input.published !== false,
    featured: Boolean(input.featured),
    icon: typeof input.icon === "string" && input.icon.trim() ? input.icon.trim() : null,
    headerImageUrl:
      typeof input.headerImageUrl === "string" && input.headerImageUrl.trim() ? input.headerImageUrl.trim() : null,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 999,
    ...(scope.isTest === true ? { isTest: true } : { isTest: false }),
  });

  const article = serializeKnowledgeArticle(doc.toObject());
  const [enriched] = await enrichArticlesWithAuthors([article]);
  return { article: enriched ?? article };
}

/**
 * @param {string} slug
 * @param {{
 *   title?: string;
 *   summary?: string;
 *   bodyMd?: string;
 *   sectionId?: string;
 *   parentSlug?: string | null;
 *   published?: boolean;
 *   audience?: string;
 *   tags?: string[];
 *   featured?: boolean;
 *   icon?: string | null;
 *   includeTest?: boolean;
 * }} input
 */
export async function updateKnowledgeArticle(slug, input) {
  await connectDb();
  const key = String(slug ?? "").trim();
  if (!key) return { error: "Slug mangler", status: 400 };

  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(input.includeTest) ? "all" : "production")
  );

  const existing = await KnowledgeArticle.findOne(
    /** @type {Record<string, unknown>} */ (andQuery(scope, { slug: key })),
  );
  if (!existing) return { error: "Artikel findes ikke", status: 404 };

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) return { error: "Titel er påkrævet", status: 400 };
    existing.title = title;
  }

  let sectionId = String(existing.sectionId ?? "");

  if (typeof input.sectionId === "string") {
    const nextSection = input.sectionId.trim();
    if (!nextSection || !KNOWLEDGE_SECTIONS.some((s) => s.id === nextSection)) {
      return { error: "Vælg en gyldig sektion", status: 400 };
    }
    sectionId = nextSection;
    existing.sectionId = sectionId;
  } else if (
    (typeof input.title === "string" ||
      typeof input.bodyMd === "string" ||
      Array.isArray(input.tags) ||
      typeof input.sectionId === "string") &&
    (!sectionId || !KNOWLEDGE_SECTIONS.some((s) => s.id === sectionId))
  ) {
    return { error: "Artiklen mangler en gyldig sektion", status: 400 };
  }

  if (typeof input.archived === "boolean") {
    existing.archived = input.archived;
    if (input.archived) existing.published = false;
  }

  if (typeof input.summary === "string") {
    const next = input.summary.trim();
    existing.summary = next ? plainTextFromHtml(next, 500) : plainTextFromHtml(existing.bodyMd, 160);
  }
  if (typeof input.bodyMd === "string") {
    existing.bodyMd = input.bodyMd.trim();
    existing.readingMinutes = estimateReadingMinutes(existing.bodyMd);
    if (!String(existing.summary ?? "").trim()) {
      existing.summary = plainTextFromHtml(existing.bodyMd, 160);
    }
  }

  if (Array.isArray(input.tags)) {
    existing.tags = mergeTagsWithSection(input.tags, sectionId);
  } else if (typeof input.sectionId === "string") {
    existing.tags = mergeTagsWithSection(
      (existing.tags ?? []).map(String).filter((t) => !isSystemKnowledgeTag(t)),
      sectionId,
    );
  }

  if (input.audience === "client" || input.audience === "public" || input.audience === "internal") {
    existing.audience = input.audience;
  }
  if (typeof input.published === "boolean") existing.published = input.published;
  if (typeof input.featured === "boolean") existing.featured = input.featured;
  if (input.icon !== undefined) {
    existing.icon = typeof input.icon === "string" && input.icon.trim() ? input.icon.trim() : null;
  }
  if (input.headerImageUrl !== undefined) {
    existing.headerImageUrl =
      typeof input.headerImageUrl === "string" && input.headerImageUrl.trim() ? input.headerImageUrl.trim() : null;
  }

  await existing.save();
  const article = serializeKnowledgeArticle(existing.toObject());
  const [enriched] = await enrichArticlesWithAuthors([article]);
  return { article: enriched ?? article };
}

/**
 * @param {string} slug
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function deleteKnowledgeArticle(slug, opts = {}) {
  await connectDb();
  const key = String(slug ?? "").trim();
  if (!key) return { error: "Slug mangler", status: 400 };

  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production")
  );

  const result = await KnowledgeArticle.deleteOne(
    /** @type {Record<string, unknown>} */ (andQuery(scope, { slug: key })),
  );
  if (!result.deletedCount) return { error: "Artikel findes ikke", status: 404 };
  return { ok: true };
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchKnowledgeAuthorOptions(opts = {}) {
  const articles = await fetchKnowledgeArticles(opts);
  /** @type {Map<string, import("@/lib/crm/knowledge-utils").KnowledgeAuthorView>} */
  const map = new Map();
  for (const a of articles) {
    if (a.authorId && a.author) map.set(a.authorId, a.author);
    else if (a.authorId) {
      map.set(a.authorId, { id: a.authorId, name: a.authorId, avatar: a.authorId.slice(0, 2), hue: 220 });
    }
  }
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "da"));
}

/**
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function fetchKnowledgeTagSuggestions(opts = {}) {
  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production")
  );

  const raw = await KnowledgeArticle.distinct("tags", scope);
  const tags = (Array.isArray(raw) ? raw : [])
    .map(String)
    .filter((t) => t && !t.startsWith("section:"))
    .sort((a, b) => a.localeCompare(b, "da"));

  return [...new Set(tags)];
}

export { relatedKnowledgeArticles };
