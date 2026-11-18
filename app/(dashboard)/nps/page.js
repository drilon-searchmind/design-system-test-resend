import { NpsPageClient } from "@/components/nps/nps-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "NPS · Searchmind 1337 OS" };

export default function NpsPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <NpsPageClient />
    </main>
  );
}
