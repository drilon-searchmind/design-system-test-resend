import { notFound } from "next/navigation";

import { KbArticleBody } from "@/components/kb/kb-article-body";
import { KbArticleHeader } from "@/components/kb/kb-article-header";
import { KbArticleMetaCard } from "@/components/kb/kb-article-meta-card";
import { KbRelatedArticles } from "@/components/kb/kb-related-articles";
import { shellMainStudio } from "@/config/shell";
import { getKnowledgeArticleBySlug, getRelatedKnowledgeArticles } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ slug: string }> }} props */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getKnowledgeArticleBySlug(slug);
  if (!article) return { title: "Knowledge base · 1337-crm by Searchmind" };
  const draft = article.published ? "" : " (kladde)";
  return { title: `${article.title}${draft} · Knowledge base · 1337-crm by Searchmind` };
}

/** @param {{ params: Promise<{ slug: string }> }} props */
export default async function KnowledgeArticlePage({ params }) {
  const { slug } = await params;
  const article = getKnowledgeArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedKnowledgeArticles(article, 4);

  return (
    <main className={cn(shellMainStudio)}>
      <KbArticleHeader article={article} />

      <section className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.22fr)_minmax(260px,0.78fr)] lg:items-start">
        <article className="tally-panel min-w-0 p-4 md:p-[length:var(--ds-studio-pad-main)]">
          <h2 className="sr-only">Indhold</h2>
          <KbArticleBody bodyMd={article.bodyMd} />
        </article>
        <div className="flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]">
          <KbArticleMetaCard article={article} />
          <KbRelatedArticles articles={related} />
        </div>
      </section>
    </main>
  );
}
