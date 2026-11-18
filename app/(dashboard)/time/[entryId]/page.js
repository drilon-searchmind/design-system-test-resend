import { TimeEntryDetailPageClient } from "@/components/time/time-entry-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ entryId: string }> }} props */
export async function generateMetadata({ params }) {
  const { entryId } = await params;
  return {
    title: `Registrering ${entryId.length > 32 ? `${entryId.slice(0, 32)}…` : entryId} · 1337 OS`,
  };
}

/** @param {{ params: Promise<{ entryId: string }> }} props */
export default async function TimeEntryDetailRoute({ params }) {
  const { entryId } = await params;
  return (
    <main className={cn(shellMainStudio)}>
      <TimeEntryDetailPageClient entryId={entryId} />
    </main>
  );
}
