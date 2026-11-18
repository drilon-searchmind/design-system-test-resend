import { TasksPageClient } from "@/components/tasks/tasks-page-client";
import { shellMainStudio } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Opgaver · Searchmind 1337 OS" };

export default function TasksPage() {
  return (
    <main className={cn(shellMainStudio)}>
      <TasksPageClient />
    </main>
  );
}
