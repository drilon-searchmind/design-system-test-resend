import mongoose from "mongoose";

import { TaskDetailPageClient } from "@/components/tasks/task-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import Task from "@/lib/db/models/task";
import { TASKS } from "@/lib/crm/static-data";
import { connectDb } from "@/lib/db/mongoose";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ taskId: string; subTaskId: string }> }} props */
export async function generateMetadata({ params }) {
  const { taskId, subTaskId } = await params;
  const demoRow = TASKS.find((t) => t.id === subTaskId);
  if (demoRow) return { title: `${demoRow.title} · Delopgave · 1337-crm by Searchmind` };

  try {
    await connectDb();
    if (!mongoose.Types.ObjectId.isValid(subTaskId)) {
      return { title: "Delopgave · 1337-crm by Searchmind" };
    }
    const tdoc = await Task.findById(subTaskId).select("title isSubTask parentTaskId").lean();
    if (
      tdoc &&
      tdoc.isSubTask === true &&
      String(tdoc.parentTaskId ?? "") === taskId &&
      typeof tdoc.title === "string" &&
      tdoc.title.trim()
    ) {
      return { title: `${tdoc.title} · Delopgave · 1337-crm by Searchmind` };
    }
    return { title: "Delopgave · 1337-crm by Searchmind" };
  } catch {
    return { title: "Delopgave · 1337-crm by Searchmind" };
  }
}

/** @param {{ params: Promise<{ taskId: string; subTaskId: string }> }} props */
export default async function TaskSubtaskDetailPage({ params }) {
  const { taskId, subTaskId } = await params;
  return (
    <main className={cn(shellMainStudio)}>
      <TaskDetailPageClient taskId={subTaskId} parentTaskId={taskId} />
    </main>
  );
}
