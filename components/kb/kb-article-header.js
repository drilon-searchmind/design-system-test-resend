import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeCategoryById } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/crm/knowledge-data.js").KNOWLEDGE_ARTICLES[number]} KbArticle */

/**
 * @param {{ article: KbArticle }} props
 */
export function KbArticleHeader({ article }) {
  const cat = getKnowledgeCategoryById(article.categoryId);
  const author = TEAM.find((m) => m.id === article.authorId);

  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-6">
      <nav aria-label="Brødkrummer" className="flex flex-wrap items-center gap-1 text-[11px] text-fg-quiet">
        <Link href={routes.kb} className="text-fg-muted transition-colors hover:text-agency-brand">
          Knowledge base
        </Link>
        <span aria-hidden>/</span>
        {cat ? (
          <>
            <Link
              href={{ pathname: routes.kb, query: { cat: cat.id } }}
              className="text-fg-muted transition-colors hover:text-agency-brand"
            >
              {cat.name}
            </Link>
            <span aria-hidden>/</span>
          </>
        ) : null}
        <span className="truncate text-fg-soft">{article.slug}</span>
      </nav>

      {!article.published ? (
        <p className="rounded-xl border border-agency-warn-border bg-agency-warn-soft px-3 py-2.5 font-sans text-[12px] leading-snug text-agency-warn">
          <span className="font-semibold">Kladde</span> — synlig internt i Agency OS. Udskjul for eksterne
          portals når synkronisering er aktiv.
        </p>
      ) : null}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">{article.title}</h1>
          {article.featured ? (
            <span className="rounded border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 text-[9px] font-semibold uppercase text-agency-brand">
              Udvalgt
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-prose font-sans text-[14px] leading-relaxed text-fg-muted">{article.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border-soft pt-4">
        {author ? (
          <div className="flex items-center gap-2">
            <CrmAvatar label={author.avatar} hue={author.hue} className="size-9 text-[12px]" />
            <div>
              <div className="font-sans text-[12px] font-medium text-fg">{author.name}</div>
              <div className="text-[10px] text-fg-quiet">{author.role}</div>
            </div>
          </div>
        ) : null}
        <div className="h-8 w-px bg-border-soft" aria-hidden />
        <div className="text-[11px] tabular-nums text-fg-muted">
          <div>Opdateret {formatIsoDateDa(article.updatedAt)}</div>
          <div className="text-fg-quiet">
            {article.readingMinutes} min ·{" "}
            <span className={cn(article.audience === "client" && "text-agency-ok")}>
              {article.audience === "client" ? "Kunde" : article.audience === "public" ? "Offentlig" : "Intern"}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 text-[10px] text-fg-quiet md:text-right">
          <span className="text-fg-soft">slug</span>{" "}
          <span className="rounded border border-border-soft bg-surface-muted px-1 py-0.5 text-fg-muted">{article.slug}</span>
        </div>
      </div>
    </div>
  );
}
