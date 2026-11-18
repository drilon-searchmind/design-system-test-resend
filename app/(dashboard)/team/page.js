import { Suspense } from "react";

import { TeamPageClient } from "@/components/team/team-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Team · Searchmind 1337 OS" };

function TeamPageFallback() {
  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="h-28 animate-pulse rounded-xl bg-skeleton" />
      <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <Suspense fallback={<TeamPageFallback />}>
        <TeamPageClient />
      </Suspense>
    </main>
  );
}
