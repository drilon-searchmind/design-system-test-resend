import { WorkloadMemberPageClient } from "@/components/workload/workload-member-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Belægning · medarbejder · 1337-crm by Searchmind" };

export default function WorkloadMemberPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <WorkloadMemberPageClient />
    </main>
  );
}
