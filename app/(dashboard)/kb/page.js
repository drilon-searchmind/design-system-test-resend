import { KbContributorsCard } from "@/components/kb/kb-contributors-card";
import { KbDirectory } from "@/components/kb/kb-directory";
import { KbFeaturedRow } from "@/components/kb/kb-featured-row";
import { KbPageHeader } from "@/components/kb/kb-page-header";
import { KbQuickLinksCard } from "@/components/kb/kb-quick-links-card";
import { KbStarterCard } from "@/components/kb/kb-starter-card";
import { KbSummaryStrip } from "@/components/kb/kb-summary-strip";
import { shellMainStudio } from "@/config/shell";
import { KNOWLEDGE_CATEGORIES } from "@/lib/crm/knowledge-data";
import { getFeaturedKnowledgeArticles, knowledgeAgencyStats } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Knowledge base · 1337-crm by Searchmind" };

/** @param {{ searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }} props */
export default async function KnowledgeBasePage({ searchParams }) {
  const sp = await Promise.resolve(searchParams ?? {});
  const catRaw = typeof sp.cat === "string" ? sp.cat : Array.isArray(sp.cat) ? sp.cat[0] : undefined;
  const authorRaw = typeof sp.author === "string" ? sp.author : Array.isArray(sp.author) ? sp.author[0] : undefined;

  const validCat = KNOWLEDGE_CATEGORIES.some((c) => c.id === catRaw) ? catRaw : undefined;
  const validAuthor = TEAM.some((m) => m.id === authorRaw) ? authorRaw : undefined;

  const featured = getFeaturedKnowledgeArticles(3);
  const stats = knowledgeAgencyStats();

  return (
    <main className={cn(shellMainStudio)}>
      <KbPageHeader />

      <KbSummaryStrip
        totalPublished={stats.totalPublished}
        drafts={stats.drafts}
        categoriesUsed={stats.categoriesUsed}
        tagCount={stats.tagCount}
        lastUpdatedIso={stats.lastUpdatedIso}
      />

      <KbFeaturedRow articles={featured} />

      <div className="grid w-full min-w-0 gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-3 xl:items-start">
        <KbStarterCard />
        <KbQuickLinksCard />
        <KbContributorsCard />
      </div>

      <KbDirectory
        key={`${validCat ?? "all"}-${validAuthor ?? "all"}`}
        initialCategoryId={validCat}
        initialAuthorId={validAuthor}
      />
    </main>
  );
}
