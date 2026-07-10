import Link from "next/link";

import { KbAuthorChip } from "@/components/kb/kb-author-chip";
import { isSystemKnowledgeTag, kbArticleSummary } from "@/lib/crm/knowledge-utils";
import { routes, kbArticleEditHref, kbArticleHref } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   article: import("@/lib/crm/knowledge-utils").KnowledgeArticleView;
 *   childArticles?: { slug: string; title: string }[];
 * }} props
 */
export function KbArticleHeader({ article, childArticles = [] }) {
  const section = getKnowledgeSectionById(article.sectionId);
  const displayTags = article.tags.filter((t) => !isSystemKnowledgeTag(t));
  const summary = kbArticleSummary(article, 300);

  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <nav aria-label="Brødkrummer" className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-fg-quiet">
          <Link href={routes.kb} className="text-fg-muted transition-colors hover:text-agency-brand">
            Knowledge base
          </Link>
          <span aria-hidden>/</span>
          {section ?
            <>
              <Link
                href={{ pathname: routes.kb, query: { section: section.id } }}
                className="text-fg-muted transition-colors hover:text-agency-brand"
              >
                {section.name}
              </Link>
              <span aria-hidden>/</span>
            </>
          : null}
          <span className="truncate text-fg-soft">{article.title}</span>
        </nav>
        <Link
          href={kbArticleEditHref(article.slug)}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-border px-3 font-sans text-[12px] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
        >
          Rediger
        </Link>
      </div>

      {!article.published ?
        <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-2 font-sans text-[12px] text-agency-warn">
          <span className="font-semibold">Kladde</span> — kun synlig internt.
        </p>
      : null}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {article.icon ?
            <span className="text-xl">{article.icon}</span>
          : null}
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">
            {article.title}
          </h1>
        </div>
        {summary ?
          <p className="mt-2 max-w-prose font-sans text-[14px] leading-relaxed text-fg-muted">{summary}</p>
        : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span>Oprettet af</span>
          <KbAuthorChip author={article.author} authorId={article.authorId} size="md" />
        </span>
        <span className="text-fg-quiet">·</span>
        <span>Oprettet {formatIsoDateDa(article.createdAt)}</span>
        <span className="text-fg-quiet">·</span>
        <span>Opdateret {formatIsoDateDa(article.updatedAt)}</span>
        <span className="text-fg-quiet">·</span>
        <span>{article.readingMinutes} min læsning</span>
        {section ?
          <>
            <span className="text-fg-quiet">·</span>
            <span>{section.name}</span>
          </>
        : null}
        <span className="text-fg-quiet">·</span>
        <span
          className={cn(
            article.audience === "client" && "text-agency-ok",
            article.audience === "public" && "text-agency-brand",
          )}
        >
          {article.audience === "client" ? "Kunde" : article.audience === "public" ? "Offentlig" : "Intern"}
        </span>
      </div>

      {displayTags.length > 0 ?
        <ul className="flex flex-wrap gap-1.5">
          {displayTags.map((tag) => (
            <li key={tag}>
              <Link
                href={{ pathname: routes.kb, query: { tag } }}
                className="rounded border border-border-soft px-1.5 py-0.5 font-sans text-[10px] text-fg-quiet transition-colors hover:border-agency-brand-border hover:text-fg"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      : null}

      {childArticles.length > 0 ?
        <nav className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Underemner</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {childArticles.map((child) => (
              <li key={child.slug}>
                <Link
                  href={kbArticleHref(child.slug)}
                  className="rounded-md border border-border bg-surface-card px-2 py-1 font-sans text-[11px] text-fg hover:border-agency-brand-border"
                >
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      : null}
    </div>
  );
}
