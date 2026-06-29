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
  if (demoRow) return { title: `${demoRow.title} · Opgave · 1337-crm by Searchmind` };

  try {
    await connectDb();
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return { title: "Opgave · 1337-crm by Searchmind" };
    }
    const tdoc = await Task.findById(taskId).select("title").lean();
    if (tdoc && typeof tdoc.title === "string" && tdoc.title.trim()) {
      return { title: `${tdoc.title} · Opgave · 1337-crm by Searchmind` };
    }
    return { title: "Opgave · 1337-crm by Searchmind" };
  } catch {
    return { title: "Opgave · 1337-crm by Searchmind" };
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
