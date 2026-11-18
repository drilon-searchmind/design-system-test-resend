import mongoose from "mongoose";

import { TaskDetailPageClient } from "@/components/tasks/task-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import Task from "@/lib/db/models/task";
import { TASKS } from "@/lib/crm/static-data";
import { connectDb } from "@/lib/db/mongoose";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ taskId: string }> }} props */
export async function generateMetadata({ params }) {
  const { taskId } = await params;
  const demoRow = TASKS.find((t) => t.id === taskId);
  if (demoRow) return { title: `${demoRow.title} · Opgave · Searchmind 1337 OS` };

  try {
    await connectDb();
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return { title: "Opgave · Searchmind 1337 OS" };
    }
    const tdoc = await Task.findById(taskId).select("title").lean();
    if (tdoc && typeof tdoc.title === "string" && tdoc.title.trim()) {
      return { title: `${tdoc.title} · Opgave · Searchmind 1337 OS` };
    }
    return { title: "Opgave · Searchmind 1337 OS" };
  } catch {
    return { title: "Opgave · Searchmind 1337 OS" };
  }
}

/** @param {{ params: Promise<{ taskId: string }> }} props */
export default async function TaskDetailPage({ params }) {
  const { taskId } = await params;
  return (
    <main className={cn(shellMainStudio)}>
      <TaskDetailPageClient taskId={taskId} />
    </main>
  );
}
