import { NotificationsPageClient } from "@/components/crm/notifications-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifikationer · Searchmind 1337 OS" };

export default function NotificationsPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <NotificationsPageClient />
    </main>
  );
}
