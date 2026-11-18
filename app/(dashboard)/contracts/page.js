import { ContractsPageClient } from "@/components/contracts/contracts-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kontrakter · Searchmind 1337 OS" };

export default function ContractsPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <ContractsPageClient />
    </main>
  );
}
