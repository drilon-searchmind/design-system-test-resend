import { ClientDetailPageClient } from "@/components/clients/client-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ cvr: string }> }} props */
export async function generateMetadata({ params }) {
  const { cvr } = await params;
  return { title: `Koncern ${cvr} · Kunder · 1337-crm by Searchmind` };
}

/** @param {{ params: Promise<{ cvr: string }> }} props */
export default async function ClientGroupDetailPage({ params }) {
  const { cvr } = await params;

  return (
    <main className={cn(shellMainStudio)}>
      <ClientDetailPageClient clientSlug={`koncern-${cvr}`} groupCvr={cvr} />
    </main>
  );
}
