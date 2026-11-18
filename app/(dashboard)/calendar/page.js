import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Min kalender · Searchmind 1337 OS" };

export default function CalendarPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <CalendarPageClient />
    </main>
  );
}
