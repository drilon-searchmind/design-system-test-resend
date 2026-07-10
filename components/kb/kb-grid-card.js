import Link from "next/link";

import { KbAuthorChip } from "@/components/kb/kb-author-chip";
import { kbArticleHref } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { isSystemKnowledgeTag, kbArticleSummary } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{ article: import("@/lib/crm/knowledge-utils").KnowledgeArticleView }} props
 */
export function KbGridCard({ article }) {
  const section = getKnowledgeSectionById(article.sectionId);

  return (
    <Link
      href={kbArticleHref(article.slug)}
      className={cn(
        "tally-panel flex min-h-[120px] flex-col p-3",
        "transition-colors hover:border-agency-brand-border hover:bg-surface-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex rounded border border-border-soft bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-soft"
          style={
            section
              ? {
                  borderColor: `oklch(0.55 0.08 ${section.deptHue} / 0.45)`,
                }
              : undefined
          }
        >
          {section?.name ?? section?.short ?? "—"}
        </span>
        {!article.published ?
          <span className="rounded border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-warn">
            Kladde
          </span>
        : <AudiencePill audience={article.audience} />}
      </div>
      <h3 className="mt-2 line-clamp-2 font-sans text-[13px] font-semibold leading-snug text-fg">{article.title}</h3>
      <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-snug text-fg-muted">{kbArticleSummary(article)}</p>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {article.tags.filter((t) => !isSystemKnowledgeTag(t)).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded border border-border-soft px-1.5 py-0 text-[9px] text-fg-quiet">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-border-soft pt-2">
        <KbAuthorChip author={article.author} authorId={article.authorId} size="md" showName={false} />
        <div className="min-w-0 flex-1 text-[10px] text-fg-quiet">
          <div className="truncate font-medium text-fg">{article.author?.name ?? article.authorId ?? "Ukendt"}</div>
          <div className="tabular-nums">
            {formatIsoDateDa(article.updatedAt)} · {article.readingMinutes} min
          </div>
        </div>
      </div>
    </Link>
  );
}

/** @param {{ audience: 'internal'|'client'|'public' }} props */
function AudiencePill({ audience }) {
  const label = audience === "client" ? "Kunde" : audience === "public" ? "Offentlig" : "Intern";
  const tone =
    audience === "client"
      ? "border-agency-ok-border bg-agency-ok-soft text-agency-ok"
      : audience === "public"
        ? "border-border bg-surface-muted text-fg-muted"
        : "border-border-soft bg-surface-muted text-fg-soft";

  return (
    <span className={cn("rounded border px-1.5 py-0 text-[9px] font-semibold uppercase tabular-nums", tone)}>
      {label}
    </span>
  );
}
