import { TovClientPage } from "@/components/tov/tov-client-page";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Brand Core · Searchmind 1337 OS" };

export default async function TovClientRoute({ params }) {
  const { clientId } = await params;
  return (
    <main className={cn(shellMainStudio)}>
      <TovClientPage clientKey={clientId} />
    </main>
  );
}
