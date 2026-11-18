"use client";

import { useEffect, useRef, useState } from "react";

import { readRichTextEditorHtml, TaskRichTextEditor } from "@/components/tasks/task-rich-text-editor";
import { cn } from "@/lib/utils";

/** @typedef {import('@/components/tasks/use-task-field-save').TaskFieldStatus} TaskFieldStatus */

/** @param {{ status?: TaskFieldStatus | null; className?: string }} props */
export function TaskFieldStatusHint({ status, className }) {
  if (!status) return null;
  return (
    <span
      role="status"
      className={cn(
        "shrink-0 font-sans text-[10px] font-medium",
        status === "saved" ? "text-agency-ok" : "text-fg-quiet",
        className,
      )}
    >
      {status === "saved" ? "Gemt ✓" : "Gemmer…"}
    </span>
  );
}

/**
 * Click-to-edit task title (Enter gemmer, Esc annullerer).
 * @param {{
 *   title: string;
 *   readOnly?: boolean;
 *   status?: TaskFieldStatus | null;
 *   onSave?: (next: string) => Promise<boolean> | void;
 * }} props
 */
export function TaskDetailInlineTitle({ title, readOnly = false, status = null, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const skipBlurRef = useRef(false);
  const editable = !readOnly && typeof onSave === "function";

  function startEdit() {
    if (!editable) return;
    skipBlurRef.current = false;
    setValue(title);
    setEditing(true);
  }

  function commit() {
    if (skipBlurRef.current) return;
    skipBlurRef.current = true;
    setEditing(false);
    const next = value.trim();
    if (!next || next === title.trim()) return;
    void onSave?.(next);
  }

  function cancel() {
    skipBlurRef.current = true;
    setEditing(false);
  }

  const headingClass = "font-sans text-[22px] font-semibold tracking-tight text-fg";

  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 md:mt-3">
      {editing ?
        <input
          autoFocus
          value={value}
          aria-label="Titel"
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            headingClass,
            "-mx-1.5 w-full min-w-0 rounded-md border border-border bg-surface-muted px-1.5 outline-none",
            "focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      : <h1 className={cn(headingClass, "min-w-0")}>
          {editable ?
            <button
              type="button"
              onClick={startEdit}
              title="Klik for at redigere titel"
              className="-mx-1.5 rounded-md px-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
            >
              {title}
            </button>
          : title}
        </h1>
      }
      <TaskFieldStatusHint status={status} />
    </div>
  );
}

/**
 * Description card with inline rich-text editing.
 * @param {{
 *   html: string;
 *   readOnly?: boolean;
 *   status?: TaskFieldStatus | null;
 *   onSave?: (nextHtml: string) => Promise<boolean>;
 * }} props
 */
export function TaskDetailInlineDescription({ html, readOnly = false, status = null, onSave }) {
  const [editing, setEditing] = useState(false);
  const editorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const draftRef = useRef("");
  const editable = !readOnly && typeof onSave === "function";
  const descriptionHtml = html.trim();

  useEffect(() => {
    if (!editing) return;
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = draftRef.current;
    el.focus();
  }, [editing]);

  function startEdit() {
    if (!editable) return;
    draftRef.current = descriptionHtml;
    setEditing(true);
  }

  async function save() {
    const next = readRichTextEditorHtml(editorRef.current);
    setEditing(false);
    if (next.trim() === descriptionHtml) return;
    const ok = await onSave?.(next);
    if (ok === false) {
      draftRef.current = next;
      setEditing(true);
    }
  }

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Beskrivelse</h2>
        <TaskFieldStatusHint status={status} />
      </div>

      {editing ?
        <div className="mt-3 flex flex-col gap-2">
          <TaskRichTextEditor editorRef={editorRef} minHeightClass="min-h-[140px]" />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-8 rounded-md border border-border bg-surface-muted px-3 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="h-8 rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Gem
            </button>
          </div>
        </div>
      : descriptionHtml ?
        <div
          role={editable ? "button" : undefined}
          tabIndex={editable ? 0 : undefined}
          title={editable ? "Klik for at redigere beskrivelse" : undefined}
          onClick={(e) => {
            if (/** @type {HTMLElement} */ (e.target).closest("a")) return;
            startEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target === e.currentTarget) {
              e.preventDefault();
              startEdit();
            }
          }}
          className={cn(
            "task-comment-body -mx-2 mt-2 rounded-lg px-2 py-1 font-sans text-[13px] leading-relaxed text-fg-muted",
            editable &&
              "cursor-text transition-colors hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      : editable ?
        <button
          type="button"
          onClick={startEdit}
          className="mt-3 w-full rounded-lg border border-dashed border-border px-3 py-4 text-left font-sans text-[13px] text-fg-quiet transition-colors hover:border-agency-brand-border hover:text-agency-brand"
        >
          + Tilføj beskrivelse
        </button>
      : <p className="mt-3 font-sans text-[13px] leading-relaxed text-fg-quiet">Ingen beskrivelse endnu.</p>
      }
    </div>
  );
}
