"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{
 *   disabled?: boolean;
 *   placeholder?: string;
 *   minHeightClass?: string;
 *   className?: string;
 *   editorRef?: import('react').RefObject<HTMLDivElement | null>;
 * }} props
 */
export function TaskRichTextEditor({
  disabled = false,
  placeholder = "Skriv beskrivelse…",
  minHeightClass = "min-h-[120px]",
  className,
  editorRef: externalRef,
}) {
  const internalRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const editorRef = externalRef ?? internalRef;

  const exec = useCallback((cmd, val) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }, [editorRef]);

  return (
    <div className={cn("rounded-xl border border-border bg-surface-muted/40", className)}>
      <div className="flex flex-wrap gap-1 border-b border-border-soft px-2 py-1.5">
        {[
          { label: "B", cmd: "bold", title: "Fed" },
          { label: "I", cmd: "italic", title: "Kursiv" },
          { label: "U", cmd: "underline", title: "Understreg" },
        ].map((b) => (
          <button
            key={b.cmd}
            type="button"
            title={b.title}
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(b.cmd);
            }}
            className="inline-flex size-7 items-center justify-center rounded-md border border-transparent font-sans text-[12px] font-semibold text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          title="Punktopstilling"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          className="inline-flex h-7 items-center rounded-md border border-transparent px-2 font-sans text-[11px] text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
        >
          • Liste
        </button>
      </div>

      <div className="p-3">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          className={cn(
            "task-comment-editor max-h-[280px] overflow-y-auto font-sans text-[13px] leading-relaxed text-fg outline-none",
            minHeightClass,
            disabled && "opacity-60",
          )}
        />
      </div>
    </div>
  );
}

/** @param {HTMLDivElement | null} el */
export function readRichTextEditorHtml(el) {
  if (!el) return "";
  const plain = el.innerText?.trim() ?? "";
  if (!plain) return "";
  return el.innerHTML ?? "";
}
