import { WorkloadPageClient } from "@/components/workload/workload-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Belægning · Searchmind 1337 OS" };

export default function WorkloadPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <WorkloadPageClient />
    </main>
  );
}
