import { ClientsPortfolio } from "@/components/clients/clients-portfolio";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kunder · Searchmind 1337 OS" };

export default function ClientsPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <ClientsPortfolio />
    </main>
  );
}
