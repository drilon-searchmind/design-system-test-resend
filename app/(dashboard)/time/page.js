import { TimePageClient } from "@/components/time/time-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tidsregistrering · Searchmind 1337 OS" };

export default function TimePage() {
  return (
    <main className={cn(shellMainStudio)}>
      <TimePageClient />
    </main>
  );
}
