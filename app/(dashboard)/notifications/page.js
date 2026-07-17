import { NotificationsPageClient } from "@/components/crm/notifications-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifikationer · 1337-crm by Searchmind" };

export default function NotificationsPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <NotificationsPageClient />
    </main>
  );
}
