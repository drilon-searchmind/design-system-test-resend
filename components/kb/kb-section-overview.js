import Link from "next/link";

import { kbArticleHref, routes } from "@/config/routes";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { kbArticleSummary } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   sections: { id: string; name: string; short: string; description: string; icon?: string }[];
 *   articles: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   featured: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   activeSectionId?: string;
 * }} props
 */
export function KbSectionOverview({ sections, articles, featured, activeSectionId }) {
  const published = articles.filter((a) => a.published && !a.archived);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="tally-panel p-3 md:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-fg-soft">Sektioner</h2>
          <p className="font-sans text-[10px] text-fg-quiet">Klik for at filtrere artikler</p>
        </div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {sections.map((section) => {
            const count = published.filter((a) => a.sectionId === section.id).length;
            const active = activeSectionId === section.id;
            return (
              <li key={section.id}>
                <Link
                  href={{ pathname: routes.kb, query: { section: section.id }, hash: "kb-directory" }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                    active ?
                      "border-agency-brand-border bg-agency-brand-soft/30"
                    : "border-border-soft bg-surface-muted/40 hover:border-agency-brand-border hover:bg-agency-brand-soft/20",
                  )}
                >
                  <span className="text-lg leading-none">{section.icon ?? "📄"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-[13px] font-medium text-fg">{section.name}</span>
                    <span className="mt-0.5 block line-clamp-1 text-[10px] text-fg-muted">{section.description}</span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex min-w-[2rem] shrink-0 items-center justify-center rounded-full px-2 py-0.5 font-sans text-[12px] font-semibold tabular-nums",
                      count > 0 ?
                        active ?
                          "bg-agency-brand text-canvas"
                        : "bg-agency-brand-soft text-agency-brand"
                      : "border border-dashed border-border text-fg-quiet",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {featured.length > 0 ?
        <section className="tally-panel p-3 md:p-4">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-fg-soft">Udvalgte</h2>
          <ul className="mt-2 space-y-2">
            {featured.map((art) => {
              const section = getKnowledgeSectionById(art.sectionId);
              const summary = kbArticleSummary(art, 100);
              return (
                <li key={art.slug}>
                  <Link
                    href={kbArticleHref(art.slug)}
                    className="group flex gap-3 rounded-lg border border-border-soft p-2 transition-colors hover:border-agency-brand-border hover:bg-surface-muted"
                  >
                    {art.headerImageUrl ?
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border-soft bg-surface-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={art.headerImageUrl}
                          alt=""
                          className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                        />
                      </div>
                    : null}
                    <span className="min-w-0 flex-1">
                      <span className="font-sans text-[13px] font-medium text-fg group-hover:text-agency-brand">
                        {art.title}
                      </span>
                      {summary ?
                        <span className="mt-0.5 block line-clamp-2 text-[11px] text-fg-muted">{summary}</span>
                      : null}
                      <span className="mt-1 text-[10px] text-fg-quiet">{section?.name ?? art.sectionId}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      : null}
    </div>
  );
}
