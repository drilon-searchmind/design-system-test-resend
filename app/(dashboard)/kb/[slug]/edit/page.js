import { notFound } from "next/navigation";

import { KbArticleForm } from "@/components/kb/kb-article-form";
import { shellMainStudio } from "@/config/shell";
import { fetchKnowledgeArticleBySlug, fetchKnowledgeTagSuggestions } from "@/lib/server/knowledge-data";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ slug: string }> }} props */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await fetchKnowledgeArticleBySlug(slug);
  if (!article) return { title: "Rediger artikel · Knowledge base · 1337-crm by Searchmind" };
  return { title: `Rediger: ${article.title} · Knowledge base · 1337-crm by Searchmind` };
}

/** @param {{ params: Promise<{ slug: string }> }} props */
export default async function KbEditArticlePage({ params }) {
  const { slug } = await params;
  const article = await fetchKnowledgeArticleBySlug(slug);
  if (!article) notFound();

  const tagSuggestions = await fetchKnowledgeTagSuggestions();

  return (
    <main className={cn(shellMainStudio, "flex flex-col")}>
      <KbArticleForm mode="edit" article={article} tagSuggestions={tagSuggestions} />
    </main>
  );
}
