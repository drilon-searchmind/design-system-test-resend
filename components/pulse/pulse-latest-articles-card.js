"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KbAuthorChip } from "@/components/kb/kb-author-chip";
import { IconDoc } from "@/components/crm/icons";
import { PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { kbArticleHref, routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { kbArticleSummary } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/crm/knowledge-utils").KnowledgeArticleView} KbArticle */

/**
 * @param {{ article: KbArticle; featured?: boolean }} props
 */
function PulseLatestArticleRow({ article, featured = false }) {
  const section = getKnowledgeSectionById(article.sectionId);
  const summary = kbArticleSummary(article, featured ? 120 : 72);

  return (
    <Link
      href={kbArticleHref(article.slug)}
      className={cn(
        "group flex gap-3 text-left transition-colors",
        featured ?
          "border-b border-agency-brand-border bg-agency-brand-soft/25 px-4 py-3 hover:bg-agency-brand-soft/40 md:px-5 md:py-4"
        : "border-b border-border-soft px-4 py-2.5 hover:bg-surface-muted md:px-5 last:border-0",
      )}
    >
      {article.headerImageUrl ?
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-border-soft bg-surface-muted",
            featured ? "size-20 md:size-24" : "size-12",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.headerImageUrl} alt="" className="size-full object-cover" />
        </div>
      : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg border border-border-soft bg-surface-muted text-fg-quiet",
            featured ? "size-20 md:size-24 text-2xl" : "size-12 text-base",
          )}
        >
          {article.icon ?? <IconDoc size={featured ? 22 : 16} className="text-fg-soft" />}
        </div>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          {featured ?
            <span className="rounded-full border border-agency-brand-border bg-agency-brand px-2 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wide text-canvas">
              Nyeste
            </span>
          : null}
          {section ?
            <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-fg-soft">
              {section.name}
            </span>
          : null}
        </span>
        <span
          className={cn(
            "mt-0.5 block font-sans font-semibold leading-snug text-fg group-hover:text-agency-brand",
            featured ? "text-[14px] md:text-[15px]" : "text-[12.5px]",
          )}
        >
          {article.title}
        </span>
        {summary ?
          <span className="mt-0.5 block line-clamp-2 font-sans text-[11px] leading-snug text-fg-muted">
            {summary}
          </span>
        : null}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <KbAuthorChip author={article.author} authorId={article.authorId} size="sm" />
          <span className="text-[10px] text-fg-quiet">·</span>
          <span className="font-sans text-[10px] tabular-nums text-fg-quiet">
            {formatIsoDateDa(article.updatedAt)}
          </span>
          <span className="text-[10px] text-fg-quiet">·</span>
          <span className="font-sans text-[10px] tabular-nums text-fg-quiet">{article.readingMinutes} min</span>
        </span>
      </span>

      <PulseIconChevronRight
        size={14}
        className="mt-1 shrink-0 text-fg-quiet opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

export function PulseLatestArticlesCard() {
  const [articles, setArticles] = useState(/** @type {KbArticle[]} */ ([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/kb?${databaseApiQuery()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const list = (Array.isArray(data?.articles) ? data.articles : [])
          .filter((a) => a.published && !a.archived)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5);
        if (!cancelled) setArticles(list);
      } catch {
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [newest, ...rest] = articles;

  return (
    <section className="tally-panel flex max-h-[520px] flex-col overflow-hidden" aria-labelledby="pulse-latest-kb-heading">
      <div className="shrink-0 border-b border-border px-4 py-3 md:px-5">
        <h3 id="pulse-latest-kb-heading" className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-fg">
          <IconDoc size={14} className="text-agency-brand" aria-hidden />
          Latest
        </h3>
        <p className="mt-1 font-sans text-[11.5px] text-fg-muted">Seneste opdateringer fra vidensbasen.</p>
      </div>

      {loading ?
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          <div className="h-24 animate-pulse rounded-xl bg-skeleton" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-skeleton" />
          ))}
        </div>
      : articles.length === 0 ?
        <p className="flex-1 px-4 py-6 font-sans text-[13px] text-fg-muted md:px-5">
          Ingen artikler endnu — opret den første i vidensbasen.
        </p>
      : (
        <>
          {newest ?
            <PulseLatestArticleRow article={newest} featured />
          : null}
          {rest.length > 0 ?
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {rest.map((article) => (
                <li key={article.slug}>
                  <PulseLatestArticleRow article={article} />
                </li>
              ))}
            </ul>
          : null}
        </>
      )}

      <div className="shrink-0 border-t border-border px-4 py-2.5 md:px-5">
        <Link
          href={routes.kb}
          className="inline-flex items-center gap-1 font-sans text-[12px] font-medium text-agency-brand transition-colors hover:text-fg"
        >
          Se alle artikler
          <PulseIconChevronRight size={12} />
        </Link>
      </div>
    </section>
  );
}
