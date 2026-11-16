import { TovOverview } from "@/components/tov/tov-overview";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tone of Voice · 1337-crm by Searchmind" };

export default function TovPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <TovOverview />
    </main>
  );
}
