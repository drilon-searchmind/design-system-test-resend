import Link from "next/link";

import { KbAuthorChip } from "@/components/kb/kb-author-chip";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ article: import("@/lib/crm/knowledge-utils").KnowledgeArticleView; className?: string }} props
 */
export function KbArticleMetaCard({ article, className }) {
  const section = getKnowledgeSectionById(article.sectionId);

  return (
    <div className={cn("tally-panel p-4", className)}>
      <h2 className="font-sans text-sm font-semibold text-fg">Om artiklen</h2>
      <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
        <div>
          <dt className="text-fg-soft">Forfatter</dt>
          <dd className="mt-1">
            <KbAuthorChip author={article.author} authorId={article.authorId} size="md" />
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Oprettet</dt>
          <dd className="font-medium tabular-nums text-fg">{formatIsoDateDa(article.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Opdateret</dt>
          <dd className="font-medium tabular-nums text-fg">{formatIsoDateDa(article.updatedAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Sektion</dt>
          <dd className="font-medium text-fg">
            {section ?
              <Link href={{ pathname: routes.kb, query: { section: section.id } }} className="hover:text-agency-brand">
                {section.name}
              </Link>
            : article.sectionId || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Læsetid</dt>
          <dd className="font-medium tabular-nums text-fg">{article.readingMinutes} min</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Status</dt>
          <dd className="font-medium text-fg">
            {article.archived ? "Arkiveret" : article.published ? "Publiceret" : "Kladde"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-x-2 border-t border-border-soft pt-3 font-sans text-[12px]">
        {section ?
          <>
            <Link
              href={{ pathname: routes.kb, query: { section: section.id }, hash: "kb-directory" }}
              className="text-agency-brand hover:underline"
            >
              Flere i {section.name}
            </Link>
            <span className="text-fg-quiet">·</span>
          </>
        : null}
        <Link href={routes.kb} className="text-agency-brand hover:underline">
          Wiki-forside
        </Link>
      </div>
    </div>
  );
}
