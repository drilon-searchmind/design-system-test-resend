import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeCategoryById } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ article: import("@/lib/crm/knowledge-data.js").KNOWLEDGE_ARTICLES[number] }} props
 */
export function KbGridCard({ article }) {
  const cat = getKnowledgeCategoryById(article.categoryId);
  const author = TEAM.find((m) => m.id === article.authorId);

  return (
    <Link
      href={`${routes.kb}/${article.slug}`}
      className={cn(
        "tally-panel flex min-h-[120px] flex-col p-3",
        "transition-colors hover:border-agency-brand-border hover:bg-surface-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex rounded border border-border-soft bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-soft"
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
        {!article.published ? (
          <span className="rounded border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-warn">
            Kladde
          </span>
        ) : (
          <AudiencePill audience={article.audience} />
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 font-sans text-[13px] font-semibold leading-snug text-fg">{article.title}</h3>
      <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-snug text-fg-muted">{article.summary}</p>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {article.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded border border-border-soft px-1.5 py-0 text-[9px] text-fg-quiet"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-border-soft pt-2">
        {author ? (
          <CrmAvatar label={author.avatar} hue={author.hue} className="size-[26px] shrink-0 text-[9px]" />
        ) : null}
        <div className="min-w-0 flex-1 text-[10px] text-fg-quiet">
          <div className="truncate">{author?.name ?? article.authorId}</div>
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
  const label =
    audience === "client" ? "Kunde" : audience === "public" ? "Offentlig" : "Intern";
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
