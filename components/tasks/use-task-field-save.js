"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { databaseApiQuery } from "@/lib/crm/database-api-query";

/** @typedef {"saving" | "saved"} TaskFieldStatus */

const SAVED_FLASH_MS = 1800;

/**
 * Optimistic per-field PATCH against `/api/tasks/[taskId]`.
 * @param {{
 *   taskId: string;
 *   task: Record<string, unknown> | undefined;
 *   setRemote: import('react').Dispatch<import('react').SetStateAction<Record<string, unknown> | null>>;
 *   onSettled?: () => void;
 * }} opts
 */
export function useTaskFieldSave({ taskId, task, setRemote, onSettled }) {
  const [fieldStatus, setFieldStatus] = useState(/** @type {Record<string, TaskFieldStatus>} */ ({}));
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null));
  const taskRef = useRef(task);
  const timersRef = useRef(/** @type {Map<string, ReturnType<typeof setTimeout>>} */ (new Map()));
  const pendingRef = useRef(0);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    taskRef.current = task;
    onSettledRef.current = onSettled;
  });

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  /** @param {string} field @param {TaskFieldStatus | null} status */
  const markField = useCallback((field, status) => {
    const prevTimer = timersRef.current.get(field);
    if (prevTimer) clearTimeout(prevTimer);
    timersRef.current.delete(field);
    setFieldStatus((cur) => {
      const next = { ...cur };
      if (status) next[field] = status;
      else delete next[field];
      return next;
    });
    if (status === "saved") {
      timersRef.current.set(
        field,
        setTimeout(() => {
          timersRef.current.delete(field);
          setFieldStatus((cur) => {
            if (cur[field] !== "saved") return cur;
            const next = { ...cur };
            delete next[field];
            return next;
          });
        }, SAVED_FLASH_MS),
      );
    }
  }, []);

  /**
   * @param {string} field UI key used for the saving/saved indicator
   * @param {Record<string, unknown>} patch API body
   * @param {Record<string, unknown>} optimistic task wire fields to apply immediately
   * @returns {Promise<boolean>}
   */
  const saveField = useCallback(
    async (field, patch, optimistic) => {
      const current = taskRef.current ?? {};
      /** @type {Record<string, unknown>} */
      const previous = {};
      for (const key of Object.keys(optimistic)) previous[key] = current[key];

      setSaveError(null);
      markField(field, "saving");
      setRemote((r) =>
        r && typeof r.task === "object" && r.task !== null ?
          { ...r, task: { .../** @type {Record<string, unknown>} */ (r.task), ...optimistic } }
        : r,
      );
      pendingRef.current += 1;

      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
        const wire = data && typeof data.wire === "object" && data.wire !== null ? data.wire : null;
        if (wire) {
          setRemote((r) => {
            if (!r || typeof r.task !== "object" || r.task === null) return r;
            const prevTask = /** @type {Record<string, unknown>} */ (r.task);
            return { ...r, task: { ...prevTask, ...wire, parentTaskTitle: prevTask.parentTaskTitle } };
          });
        }
        markField(field, "saved");
        return true;
      } catch (e) {
        setRemote((r) =>
          r && typeof r.task === "object" && r.task !== null ?
            { ...r, task: { .../** @type {Record<string, unknown>} */ (r.task), ...previous } }
          : r,
        );
        markField(field, null);
        setSaveError(e instanceof Error ? e.message : "Fejl ved gem");
        return false;
      } finally {
        pendingRef.current -= 1;
        if (pendingRef.current === 0) onSettledRef.current?.();
      }
    },
    [markField, setRemote, taskId],
  );

  return { saveField, fieldStatus, saveError, setSaveError };
}
