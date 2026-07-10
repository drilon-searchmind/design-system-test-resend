import { Suspense } from "react";

import { UsersPageClient } from "@/components/users/users-page-client";
import { shellMainStudio } from "@/config/shell";
import { requireAdminPage } from "@/lib/server/require-admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Brugerstyring · 1337-crm by Searchmind" };

function Fallback() {
  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="h-28 animate-pulse rounded-xl bg-skeleton" />
      <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
        ))}
      </div>
    </div>
  );
}

export default async function UsersAdminPage() {
  await requireAdminPage();

  return (
    <main className={cn(shellMainStudio)}>
      <Suspense fallback={<Fallback />}>
        <UsersPageClient />
      </Suspense>
    </main>
  );
}
