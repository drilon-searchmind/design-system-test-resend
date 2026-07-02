"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { TaskDetailShell } from "@/components/tasks/task-detail-shell";
import { useDataSource } from "@/components/crm/use-data-source";

/**
 * @param {{ taskId: string }} props
 */
export function TaskDetailPageClient({ taskId }) {
  const dataSource = useDataSource();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "";
  const [highlightCommentId, setHighlightCommentId] = useState("");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.startsWith("#comment-")) {
      setHighlightCommentId(hash.slice("#comment-".length));
    }
  }, [initialTab, taskId]);

  return (
    <TaskDetailShell
      key={`${taskId}-${dataSource}`}
      taskId={taskId}
      initialTab={initialTab}
      highlightCommentId={highlightCommentId}
    />
  );
}
