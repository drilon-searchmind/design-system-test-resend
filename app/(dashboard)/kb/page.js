import { KbWorkspace } from "@/components/kb/kb-workspace";
import { shellMainStudio } from "@/config/shell";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import { fetchKnowledgeBundle } from "@/lib/server/knowledge-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Knowledge base · 1337-crm by Searchmind" };

/** @param {{ searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }} props */
export default async function KnowledgeBasePage({ searchParams }) {
  const sp = await Promise.resolve(searchParams ?? {});
  const sectionRaw =
    typeof sp.section === "string" ? sp.section : Array.isArray(sp.section) ? sp.section[0] : undefined;
  const authorRaw =
    typeof sp.author === "string" ? sp.author : Array.isArray(sp.author) ? sp.author[0] : undefined;
  const tagRaw = typeof sp.tag === "string" ? sp.tag : Array.isArray(sp.tag) ? sp.tag[0] : undefined;
  const validSection = KNOWLEDGE_SECTIONS.some((s) => s.id === sectionRaw) ? sectionRaw : undefined;

  const bundle = await fetchKnowledgeBundle();

  return (
    <main className={cn(shellMainStudio)}>
      <KbWorkspace
        bundle={bundle}
        initialSectionId={validSection}
        initialAuthorId={authorRaw}
        initialTag={tagRaw}
      />
    </main>
  );
}
