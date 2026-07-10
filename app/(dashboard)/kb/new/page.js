import { KbArticleForm } from "@/components/kb/kb-article-form";
import { shellMainStudio } from "@/config/shell";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import { fetchKnowledgeTagSuggestions } from "@/lib/server/knowledge-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ny artikel · Knowledge base · 1337-crm by Searchmind" };

/** @param {{ searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }} props */
export default async function KbNewArticlePage({ searchParams }) {
  const sp = await Promise.resolve(searchParams ?? {});
  const sectionRaw =
    typeof sp.section === "string" ? sp.section : Array.isArray(sp.section) ? sp.section[0] : undefined;
  const validSection = KNOWLEDGE_SECTIONS.some((s) => s.id === sectionRaw) ? sectionRaw : undefined;

  const tagSuggestions = await fetchKnowledgeTagSuggestions();

  return (
    <main className={cn(shellMainStudio, "flex flex-col")}>
      <KbArticleForm mode="create" tagSuggestions={tagSuggestions} initialSectionId={validSection} />
    </main>
  );
}
