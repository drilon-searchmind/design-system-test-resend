"use client";

import { useEffect, useState } from "react";

import { TaskDetailShell } from "@/components/tasks/task-detail-shell";
import { useDataSource } from "@/components/crm/use-data-source";

/**
 * @param {{ taskId: string; parentTaskId?: string }} props
 */
export function TaskDetailPageClient({ taskId, parentTaskId = "" }) {
  const dataSource = useDataSource();
  const [highlightCommentId, setHighlightCommentId] = useState("");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.startsWith("#comment-")) {
      setHighlightCommentId(hash.slice("#comment-".length));
    }
  }, [taskId]);

  return (
    <TaskDetailShell
      key={`${parentTaskId || "root"}-${taskId}-${dataSource}`}
      taskId={taskId}
      parentTaskId={parentTaskId}
      highlightCommentId={highlightCommentId}
    />
  );
}
