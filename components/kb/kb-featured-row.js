import Link from "next/link";

import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeCategoryById } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ articles: import("@/lib/crm/knowledge-data.js").KNOWLEDGE_ARTICLES }} props
 */
export function KbFeaturedRow({ articles }) {
  if (!articles.length) return null;

  return (
    <section aria-labelledby="kb-featured-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="kb-featured-heading" className="font-sans text-sm font-semibold text-fg">
          Udvalgte artikler
        </h2>
        <span className="text-[10px] uppercase tracking-[0.06em] text-fg-soft">Editor&apos;s pick</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {articles.map((article) => {
          const cat = getKnowledgeCategoryById(article.categoryId);
          const author = TEAM.find((m) => m.id === article.authorId);

          return (
            <Link
              key={article.slug}
              href={`${routes.kb}/${article.slug}`}
              className={cn(
                "tally-panel group flex min-h-[140px] flex-col p-4",
                "transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex max-w-full items-center rounded-md border border-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-fg-soft"
                  style={
                    cat
                      ? {
                          borderColor: `oklch(0.55 0.08 ${cat.deptHue} / 0.45)`,
                        }
                      : undefined
                  }
                >
                  {cat?.short ?? "—"}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-fg-quiet">
                  {article.readingMinutes} min læsning
                </span>
              </div>
              <h3 className="mt-2 font-sans text-[14px] font-semibold leading-snug tracking-tight text-fg group-hover:text-agency-brand">
                {article.title}
              </h3>
              <p className="mt-1 line-clamp-2 flex-1 font-sans text-[12px] leading-snug text-fg-muted">{article.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-soft pt-3 text-[10px] text-fg-quiet">
                <span>{author?.name ?? article.authorId}</span>
                <span aria-hidden>·</span>
                <span>{formatIsoDateDa(article.updatedAt)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
