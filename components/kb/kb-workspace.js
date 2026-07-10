"use client";

import { KbDirectory } from "@/components/kb/kb-directory";
import { KbPageHeader } from "@/components/kb/kb-page-header";
import { KbSectionOverview } from "@/components/kb/kb-section-overview";
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
 *   initialTag?: string;
 * }} props
 */
export function KbWorkspace({ bundle, initialSectionId, initialAuthorId, initialTag }) {
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
        <section className="tally-panel p-6 text-center">
          <p className="font-sans text-[14px] text-fg-muted">Ingen artikler endnu.</p>
          <p className="mt-2 font-sans text-[12px] text-fg-quiet">
            Brug <span className="font-medium text-fg">Ny artikel</span> for at oprette den første wiki-side.
          </p>
        </section>
      : <KbDirectory
          articles={bundle.articles}
          allArticles={bundle.articles}
          initialSectionId={initialSectionId}
          initialAuthorId={initialAuthorId}
          initialTag={initialTag}
          compact
        />}
    </div>
  );
}
