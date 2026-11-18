import { ClientNotesPageClient } from "@/components/clients/client-notes-page-client";
import { shellMainStudio } from "@/config/shell";
import { CLIENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ clientId: string }> }} props */
export async function generateMetadata({ params }) {
  const { clientId } = await params;
  const staticClient = CLIENTS.find((c) => c.id === clientId);
  return {
    title: `Noter · ${staticClient?.name ?? "Kunde"} · Kunder · 1337-crm by Searchmind`,
  };
}

/** @param {{ params: Promise<{ clientId: string }> }} props */
export default async function ClientNotesPage({ params }) {
  const { clientId } = await params;

  return (
    <main className={cn(shellMainStudio)}>
      <ClientNotesPageClient key={clientId} clientSlug={clientId} />
    </main>
  );
}
