import { TovOverview } from "@/components/tov/tov-overview";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Brand Core · Searchmind 1337 OS" };

export default function TovPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <TovOverview />
    </main>
  );
}
