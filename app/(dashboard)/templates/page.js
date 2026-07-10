import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Opgaveskabeloner · 1337-crm by Searchmind" };

export default function TemplatesPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <TemplatesPageClient />
    </main>
  );
}
