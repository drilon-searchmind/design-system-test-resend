import Link from "next/link";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/crm/knowledge-data.js").KNOWLEDGE_ARTICLES[number]} KbArticle */

/**
 * @param {{ article: KbArticle; className?: string }} props
 */
export function KbArticleMetaCard({ article, className }) {
  return (
    <div className={cn("tally-panel p-4", className)}>
      <h2 className="font-sans text-sm font-semibold text-fg">Metadata</h2>
      <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Publikum</dt>
          <dd className="font-medium text-fg">
            {article.audience === "client" ? "Kunde" : article.audience === "public" ? "Offentlig" : "Intern"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Status</dt>
          <dd className="font-medium text-fg">{article.published ? "Publiceret" : "Kladde"}</dd>
        </div>
        <div>
          <dt className="text-fg-soft">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded border border-border-soft px-1.5 py-0 text-[10px] text-fg-quiet">
                {tag}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-border-soft pt-3 font-sans text-[12px]">
        <Link href={routes.nps} className="text-agency-brand hover:underline">
          NPS-playbook
        </Link>
        <span className="text-fg-quiet"> · </span>
        <Link href={routes.tasks} className="text-agency-brand hover:underline">
          Opgaver
        </Link>
      </div>
    </div>
  );
}
