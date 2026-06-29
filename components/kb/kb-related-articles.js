import Link from "next/link";

import { routes } from "@/config/routes";
import { getKnowledgeCategoryById } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/crm/knowledge-data.js").KNOWLEDGE_ARTICLES[number]} KbArticle */

/**
 * @param {{ articles: KbArticle[]; className?: string }} props
 */
export function KbRelatedArticles({ articles, className }) {
  if (!articles.length) return null;

  return (
    <div className={cn("tally-panel p-4", className)}>
      <h2 className="font-sans text-sm font-semibold text-fg">Relaterede artikler</h2>
      <p className="mt-1 font-sans text-[12px] text-fg-muted">Samme kategori eller overlappende tags.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {articles.map((a) => {
          const cat = getKnowledgeCategoryById(a.categoryId);
          return (
            <li key={a.slug}>
              <Link
                href={`${routes.kb}/${a.slug}`}
                className="group block rounded-lg border border-border-soft bg-surface-muted/30 px-2.5 py-2 transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-sans text-[12px] font-medium leading-snug text-fg group-hover:text-agency-brand">
                    {a.title}
                  </span>
                  {cat ? (
                    <span
                      className="shrink-0 rounded border border-border-soft px-1 text-[9px] font-bold uppercase text-fg-soft"
                      style={{ borderColor: `oklch(0.55 0.08 ${cat.deptHue} / 0.4)` }}
                    >
                      {cat.short}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-2 font-sans text-[11px] text-fg-quiet">{a.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
