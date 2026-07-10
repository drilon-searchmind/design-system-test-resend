import { KNOWLEDGE_SECTIONS } from "./knowledge-data";

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   avatar: string;
 *   hue: number;
 *   image?: string;
 * }} KnowledgeAuthorView
 */

/**
 * @typedef {{
 *   slug: string;
 *   title: string;
 *   summary: string;
 *   bodyMd: string;
 *   sectionId: string;
 *   parentSlug?: string | null;
 *   tags: string[];
 *   audience: "internal" | "client" | "public";
 *   authorId: string;
 *   author?: KnowledgeAuthorView | null;
 *   createdAt: string;
 *   updatedAt: string;
 *   published: boolean;
 *   archived?: boolean;
 *   readingMinutes: number;
 *   featured?: boolean;
 *   icon?: string | null;
 *   headerImageUrl?: string | null;
 *   sortOrder?: number;
 * }} KnowledgeArticleView
 */

/**
 * @param {string} html
 * @param {number} [maxLen]
 */
export function plainTextFromHtml(html, maxLen = 0) {
  if (!html) return "";
  const text = String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLen > 0 && text.length > maxLen) return text.slice(0, maxLen).trim();
  return text;
}

/**
 * @param {{ summary?: string; bodyMd?: string }} article
 * @param {number} [maxLen]
 */
export function kbArticleSummary(article, maxLen = 160) {
  const raw = article.summary || article.bodyMd || "";
  return plainTextFromHtml(raw, maxLen);
}

/**
 * @param {string} tag
 */
export function isSystemKnowledgeTag(tag) {
  return tag.startsWith("section:");
}

/**
 * @param {KnowledgeArticleView[]} articles
 * @param {string} slug
 */
export function findKnowledgeArticleBySlug(articles, slug) {
  return articles.find((a) => a.slug === slug) ?? null;
}

/**
 * @param {KnowledgeArticleView[]} articles
 */
export function publishedKnowledgeArticles(articles) {
  return articles.filter((a) => a.published && !a.archived);
}

/**
 * @param {KnowledgeArticleView[]} articles
 * @param {number} [limit]
 */
export function featuredKnowledgeArticles(articles, limit = 3) {
  return articles.filter((a) => a.published && !a.archived && a.featured).slice(0, limit);
}

/**
 * @param {KnowledgeArticleView[]} articles
 */
export function knowledgeStatsFromArticles(articles) {
  const active = articles.filter((a) => !a.archived);
  const published = active.filter((a) => a.published);
  const drafts = active.filter((a) => !a.published);
  const archived = articles.filter((a) => a.archived);
  const sorted = [...articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = sorted[0];
  const sectionIds = new Set(published.map((a) => a.sectionId).filter(Boolean));

  return {
    totalPublished: published.length,
    drafts: drafts.length,
    archived: archived.length,
    sectionsUsed: sectionIds.size,
    lastUpdatedIso: latest?.updatedAt ?? null,
  };
}

/**
 * @param {KnowledgeArticleView} article
 * @param {KnowledgeArticleView[]} articles
 * @param {number} [limit]
 */
export function relatedKnowledgeArticles(article, articles, limit = 4) {
  const others = articles.filter((a) => a.slug !== article.slug && a.published);
  const scored = others.map((a) => {
    let score = 0;
    if (a.sectionId === article.sectionId) score += 4;
    if (a.parentSlug && a.parentSlug === article.slug) score += 3;
    if (article.parentSlug && a.slug === article.parentSlug) score += 3;
    score += article.tags.filter((t) => a.tags.includes(t)).length;
    return { a, score };
  });
  scored.sort(
    (x, y) =>
      y.score - x.score ||
      y.a.updatedAt.localeCompare(x.a.updatedAt) ||
      y.a.title.localeCompare(x.a.title, "da"),
  );
  return scored.slice(0, limit).map((x) => x.a);
}

/**
 * @param {string} text
 */
export function estimateReadingMinutes(text) {
  const plain = String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

/**
 * @param {string} title
 */
export function slugifyKnowledgeTitle(title) {
  return String(title ?? "artikel")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/**
 * @param {KnowledgeArticleView[]} articles
 */
export function groupArticlesBySection(articles) {
  /** @type {Record<string, KnowledgeArticleView[]>} */
  const map = {};
  for (const section of KNOWLEDGE_SECTIONS) map[section.id] = [];

  for (const article of articles) {
    const key = article.sectionId || "other";
    if (!map[key]) map[key] = [];
    map[key].push(article);
  }

  for (const key of Object.keys(map)) {
    map[key].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.title.localeCompare(b.title, "da"),
    );
  }

  return map;
}
