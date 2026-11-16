"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { Confetti, makeConfettiPieces } from "@/components/tasks/confetti";
import { TaskGridCard } from "@/components/tasks/task-grid-card";
import { taskHref } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

/** Board columns, left to right. */
export const KANBAN_COLUMNS = /** @type {const} */ ([
  { status: "todo", label: "Afventer", dot: "bg-fg-quiet" },
  { status: "doing", label: "I gang", dot: "bg-agency-brand" },
  { status: "review", label: "Review", dot: "bg-agency-warn" },
  { status: "done", label: "Færdig", dot: "bg-agency-ok" },
  { status: "blocked", label: "Blokeret", dot: "bg-agency-bad" },
]);

/** @param {unknown} v */
const validateView = (v) => (v === "normal" || v === "compact" ? v : null);

const DRAG_MIME = "application/x-crm-task";

const PRIORITY_DOT = {
  high: "bg-agency-bad",
  medium: "bg-agency-warn",
  low: "bg-fg-quiet",
};

/** Compact card: title, client, deadline. */
function CompactCard({ row, dueReferenceIso }) {
  const overdue = taskIsOverdue(row, dueReferenceIso);
  return (
    <Link
      href={taskHref(row)}
      draggable={false}
      className={cn(
        "tally-panel flex flex-col gap-1.5 px-2.5 py-2 transition-all hover:border-agency-brand-border",
        overdue && "task-overdue",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", PRIORITY_DOT[row.priority] ?? PRIORITY_DOT.low)}
          title={`Prioritet: ${row.priority}`}
        />
        <span className="line-clamp-2 font-sans text-[12.5px] font-medium leading-snug text-fg">{row.title}</span>
      </div>
      <div className="flex items-center gap-2 pl-3.5 text-[10.5px] text-fg-muted">
        <span
          className="flex size-4 shrink-0 items-center justify-center rounded text-[8px] font-semibold text-white"
          style={{ background: `oklch(62% 0.14 ${row.clientHue})` }}
        >
          {row.clientLogo}
        </span>
        <span className="min-w-0 flex-1 truncate">{row.clientName}</span>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            overdue && "font-semibold text-agency-bad",
          )}
        >
          {row.dueDate ? formatIsoDateDa(row.dueDate) : "—"}
        </span>
      </div>
    </Link>
  );
}

/**
 * Trello-style drag image: a slightly tilted clone with a shadow.
 * @param {HTMLElement} node
 * @param {import('react').DragEvent} e
 */
function setTiltedDragImage(node, e) {
  const rect = node.getBoundingClientRect();
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;top:-1000px;left:-1000px;padding:24px;pointer-events:none;`;
  const clone = /** @type {HTMLElement} */ (node.cloneNode(true));
  clone.style.cssText = `width:${rect.width}px;transform:rotate(4deg);box-shadow:0 16px 32px rgb(0 0 0 / .35);border-radius:12px;`;
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  e.dataTransfer.setDragImage(wrap, e.clientX - rect.left + 24, e.clientY - rect.top + 24);
  setTimeout(() => wrap.remove(), 0);
}

/**
 * @param {{
 *   tasks: Array<any>;
 *   departments: Array<{ id: string; short?: string }>;
 *   taskDueReferenceIso: string;
 *   onStatusChange?: (task: any, nextStatus: string) => void;
 * }} props
 */
export function TasksKanban({ tasks, departments, taskDueReferenceIso, onStatusChange }) {
  const [view, setView] = usePersistedState("crm:tasks:kanban-view:v1", "normal", { validate: validateView });
  const [draggingId, setDraggingId] = useState(/** @type {string | null} */ (null));
  const [overStatus, setOverStatus] = useState(/** @type {string | null} */ (null));
  const [settledId, setSettledId] = useState(/** @type {string | null} */ (null));
  const [confetti, setConfetti] = useState(/** @type {ReturnType<typeof makeConfettiPieces> | null} */ (null));
  const settleTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const compact = view === "compact";
  const known = new Set(KANBAN_COLUMNS.map((c) => c.status));
  /** @type {Record<string, any[]>} */
  const byStatus = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.status, []]));
  for (const t of tasks) {
    if (t.status === "cancelled") continue;
    byStatus[known.has(t.status) ? t.status : "todo"].push(t);
  }

  const canMove = typeof onStatusChange === "function";
  const dragged = draggingId ? tasks.find((t) => t.id === draggingId) : null;

  /** Change status and celebrate when a task is completed. */
  function moveTask(task, status) {
    onStatusChange?.(task, status);
    if (status === "done") setConfetti(makeConfettiPieces());
  }

  /** @param {string} status @param {import('react').DragEvent} e */
  function handleDrop(status, e) {
    e.preventDefault();
    setOverStatus(null);
    setDraggingId(null);
    const id = e.dataTransfer.getData(DRAG_MIME);
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) {
      moveTask(task, status);
      setSettledId(id);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => setSettledId(null), 400);
    }
  }

  return (
    <div>
      {confetti ? <Confetti pieces={confetti} onDone={() => setConfetti(null)} /> : null}
      <div className="flex items-center justify-end gap-2 border-b border-border-soft px-3 py-2 md:px-4">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Visning</span>
        <PulseSegmentedControl
          size="sm"
          active={view}
          onChange={setView}
          tabs={[
            { id: "normal", label: "Normal" },
            { id: "compact", label: "Kompakt" },
          ]}
        />
      </div>

      <div className="overflow-x-auto p-3 md:p-4">
        <div className="grid min-w-[1180px] grid-cols-5 gap-3">
          {KANBAN_COLUMNS.map((col) => {
            const list = byStatus[col.status];
            const isBlocked = col.status === "blocked";
            const isOver = overStatus === col.status && draggingId !== null;
            const showSlot = isOver && dragged && dragged.status !== col.status;
            return (
              <section
                key={col.status}
                aria-label={`${col.label} (${list.length})`}
                onDragOver={
                  canMove ?
                    (e) => {
                      if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (overStatus !== col.status) setOverStatus(col.status);
                    }
                  : undefined
                }
                onDragLeave={
                  canMove ?
                    (e) => {
                      if (!e.currentTarget.contains(/** @type {Node} */ (e.relatedTarget))) setOverStatus(null);
                    }
                  : undefined
                }
                onDrop={canMove ? (e) => handleDrop(col.status, e) : undefined}
                className={cn(
                  "flex flex-col rounded-xl border transition-colors duration-150",
                  compact ? "min-h-[240px]" : "min-h-[320px]",
                  isBlocked ?
                    "border-agency-bad-border/60 bg-agency-bad-soft/40"
                  : "border-border bg-surface-muted/50",
                  isOver && (isBlocked ? "border-agency-bad bg-agency-bad-soft/70" : "border-agency-brand-border bg-agency-brand-soft/40"),
                )}
              >
                <header className="flex items-center gap-2 border-b border-border-soft px-3 py-2.5">
                  <span className={cn("size-2 rounded-full", col.dot)} aria-hidden />
                  <h4 className={cn("font-sans text-[12px] font-semibold", isBlocked ? "text-agency-bad" : "text-fg")}>
                    {col.label}
                  </h4>
                  <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-[10px] tabular-nums text-fg-quiet">
                    {list.length}
                  </span>
                </header>

                <div className={cn("flex flex-1 flex-col", compact ? "gap-1.5 p-2" : "gap-2.5 p-2.5")}>
                  {showSlot ?
                    <div
                      aria-hidden
                      className={cn(
                        "kanban-slot-in rounded-xl border-2 border-dashed",
                        compact ? "h-11" : "h-24",
                        isBlocked ? "border-agency-bad-border bg-agency-bad-soft/60" : "border-agency-brand-border bg-agency-brand-soft/50",
                      )}
                    />
                  : null}

                  {list.map((row) => {
                    const isDragging = draggingId === row.id;
                    return (
                      <div
                        key={row.id}
                        draggable={canMove}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_MIME, row.id);
                          e.dataTransfer.effectAllowed = "move";
                          setTiltedDragImage(/** @type {HTMLElement} */ (e.currentTarget), e);
                          // Defer so the drag image is captured before the card becomes a placeholder.
                          const id = row.id;
                          setTimeout(() => setDraggingId(id), 0);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverStatus(null);
                        }}
                        className={cn(
                          "rounded-xl transition-[opacity,transform] duration-150",
                          canMove && "cursor-grab active:cursor-grabbing",
                          isDragging && "scale-[0.97] opacity-30",
                          settledId === row.id && "kanban-drop-settle",
                        )}
                      >
                        {compact ?
                          <CompactCard row={row} dueReferenceIso={taskDueReferenceIso} />
                        : <TaskGridCard row={row} dueReferenceIso={taskDueReferenceIso} departments={departments} />}
                        {canMove && !compact ?
                          <label className="mt-1 flex items-center gap-2 px-1 md:hidden">
                            <span className="text-[10px] text-fg-quiet">Flyt til</span>
                            <select
                              value={row.status}
                              onChange={(e) => moveTask(row, e.target.value)}
                              className="h-7 flex-1 rounded-md border border-border bg-surface-muted px-1.5 font-sans text-[11px] text-fg"
                            >
                              {KANBAN_COLUMNS.map((c) => (
                                <option key={c.status} value={c.status}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        : null}
                      </div>
                    );
                  })}

                  {list.length === 0 && !showSlot ?
                    <p className="m-auto px-2 py-8 text-center font-sans text-[11px] text-fg-quiet">
                      {canMove ? "Træk en opgave hertil" : "Ingen opgaver"}
                    </p>
                  : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
