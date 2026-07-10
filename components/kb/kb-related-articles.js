import Link from "next/link";

import { kbArticleHref } from "@/config/routes";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { kbArticleSummary } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   articles: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   className?: string;
 * }} props
 */
export function KbRelatedArticles({ articles, className }) {
  if (!articles.length) return null;

  return (
    <div className={cn("tally-panel p-4", className)}>
      <h2 className="font-sans text-sm font-semibold text-fg">Relaterede artikler</h2>
      <p className="mt-1 font-sans text-[12px] text-fg-muted">Samme sektion eller emne.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {articles.map((a) => {
          const section = getKnowledgeSectionById(a.sectionId);
          const summary = kbArticleSummary(a, 80);
          return (
            <li key={a.slug}>
              <Link
                href={kbArticleHref(a.slug)}
                className="group flex gap-2.5 rounded-lg border border-border-soft bg-surface-muted/30 px-2 py-2 transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/25"
              >
                {a.headerImageUrl ?
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border-soft bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.headerImageUrl} alt="" className="size-full object-cover" />
                  </div>
                : null}
                <span className="min-w-0 flex-1">
                  <span className="font-sans text-[12px] font-medium leading-snug text-fg group-hover:text-agency-brand">
                    {a.title}
                  </span>
                  {summary ?
                    <span className="mt-0.5 block line-clamp-2 font-sans text-[11px] text-fg-quiet">{summary}</span>
                  : null}
                  {section ?
                    <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wide text-fg-soft">
                      {section.name}
                    </span>
                  : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
