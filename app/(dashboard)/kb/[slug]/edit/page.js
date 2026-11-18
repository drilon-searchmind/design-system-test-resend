import { notFound } from "next/navigation";

import { KbArticleForm } from "@/components/kb/kb-article-form";
import { shellMainStudio } from "@/config/shell";
import { readIncludeTestCookie } from "@/lib/server/include-test";
import { fetchKnowledgeArticleBySlug } from "@/lib/server/knowledge-data";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ slug: string }> }} props */
export async function generateMetadata({ params }) {
  const [{ slug }, includeTest] = await Promise.all([params, readIncludeTestCookie()]);
  const article = await fetchKnowledgeArticleBySlug(slug, { includeTest });
  if (!article) return { title: "Rediger artikel · Knowledge base · Searchmind 1337 OS" };
  return { title: `Rediger: ${article.title} · Knowledge base · Searchmind 1337 OS` };
}

/** @param {{ params: Promise<{ slug: string }> }} props */
export default async function KbEditArticlePage({ params }) {
  const [{ slug }, includeTest] = await Promise.all([params, readIncludeTestCookie()]);
  const article = await fetchKnowledgeArticleBySlug(slug, { includeTest });
  if (!article) notFound();

  return (
    <main className={cn(shellMainStudio, "flex flex-col")}>
      <KbArticleForm mode="edit" article={article} />
    </main>
  );
}
