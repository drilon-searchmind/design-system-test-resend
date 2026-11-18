"use client";

import Link from "next/link";

import { KbDirectory } from "@/components/kb/kb-directory";
import { KbPageHeader } from "@/components/kb/kb-page-header";
import { KbSectionOverview } from "@/components/kb/kb-section-overview";
import { routes } from "@/config/routes";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";

/**
 * @param {{
 *   bundle: {
 *     sections: typeof KNOWLEDGE_SECTIONS;
 *     articles: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *     stats: {
 *       totalPublished: number;
 *       drafts: number;
 *       sectionsUsed: number;
 *       lastUpdatedIso: string | null;
 *     };
 *     featured: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   };
 *   initialSectionId?: string;
 *   initialAuthorId?: string;
 * }} props
 */
export function KbWorkspace({ bundle, initialSectionId, initialAuthorId }) {
  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <KbPageHeader stats={bundle.stats} />

      <KbSectionOverview
        sections={KNOWLEDGE_SECTIONS}
        articles={bundle.articles}
        featured={bundle.featured}
        activeSectionId={initialSectionId}
      />

      {bundle.articles.length === 0 ?
        <section className="tally-panel flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-sans text-[14px] font-medium text-fg">Ingen artikler endnu</p>
          <p className="max-w-prose font-sans text-[12px] text-fg-muted">
            Opret den første wiki-side — et kort resumé skrives automatisk med AI, når du gemmer.
          </p>
          <Link
            href={routes.kbNew}
            className="inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-medium text-canvas"
          >
            Ny artikel
          </Link>
        </section>
      : <KbDirectory
          key={`${initialSectionId ?? ""}|${initialAuthorId ?? ""}`}
          articles={bundle.articles}
          allArticles={bundle.articles}
          initialSectionId={initialSectionId}
          initialAuthorId={initialAuthorId}
          compact
        />}
    </div>
  );
}
