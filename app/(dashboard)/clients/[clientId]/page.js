import Client from "@/lib/db/models/client";
import { ClientDetailPageClient } from "@/components/clients/client-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import { CLIENTS } from "@/lib/crm/static-data";
import { connectDb } from "@/lib/db/mongoose";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ clientId: string }> }} props */
export async function generateMetadata({ params }) {
  const { clientId } = await params;
  const staticClient = CLIENTS.find((c) => c.id === clientId);
  if (staticClient) return { title: `${staticClient.name} · Kunder · Searchmind 1337 OS` };

  try {
    await connectDb();
    const doc = await Client.findOne({ slug: clientId }).select("name").lean();
    const name = doc?.name ? String(doc.name) : null;
    if (name) return { title: `${name} · Kunder · Searchmind 1337 OS` };
  } catch {
    /* Mongo utilgængelig eller cold start — fald tilbage til generisk titel */
  }

  return { title: "Kunde · Kunder · Searchmind 1337 OS" };
}

/** @param {{ params: Promise<{ clientId: string }> }} props */
export default async function ClientDetailPage({ params }) {
  const { clientId } = await params;

  return (
    <main className={cn(shellMainStudio)}>
      <ClientDetailPageClient clientSlug={clientId} />
    </main>
  );
}
