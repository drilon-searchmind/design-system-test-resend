"use client";

import { useCallback, useRef, useEffect } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{
 *   disabled?: boolean;
 *   placeholder?: string;
 *   className?: string;
 *   initialHtml?: string;
 *   editorRef?: import('react').RefObject<HTMLDivElement | null>;
 * }} props
 */
export function KbArticleRichEditor({
  disabled = false,
  placeholder = "Skriv artiklens indhold her…",
  className,
  initialHtml = "",
  editorRef: externalRef,
}) {
  const internalRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const editorRef = externalRef ?? internalRef;

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.dataset.kbInitialized === "1") return;
    if (initialHtml) el.innerHTML = initialHtml;
    el.dataset.kbInitialized = "1";
  }, [initialHtml, editorRef]);

  const exec = useCallback(
    (cmd, val) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
    },
    [editorRef],
  );

  const formatBlock = useCallback(
    (tag) => {
      editorRef.current?.focus();
      document.execCommand("formatBlock", false, tag);
    },
    [editorRef],
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface-card", className)}>
      <div className="flex flex-wrap gap-1 border-b border-border-soft px-3 py-2">
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
            className="inline-flex size-8 items-center justify-center rounded-md border border-transparent font-sans text-[13px] font-semibold text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          title="Overskrift"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            formatBlock("h2");
          }}
          className="inline-flex h-8 items-center rounded-md border border-transparent px-2.5 font-sans text-[11px] font-medium text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
        >
          H2
        </button>
        <button
          type="button"
          title="Punktopstilling"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          className="inline-flex h-8 items-center rounded-md border border-transparent px-2.5 font-sans text-[11px] text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
        >
          • Liste
        </button>
        <button
          type="button"
          title="Nummereret liste"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
          className="inline-flex h-8 items-center rounded-md border border-transparent px-2.5 font-sans text-[11px] text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg disabled:opacity-40"
        >
          1. Liste
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Artikelindhold"
          data-placeholder={placeholder}
          className={cn(
            "kb-article-editor task-comment-editor min-h-[min(60vh,520px)] flex-1 overflow-y-auto font-sans text-[15px] leading-relaxed text-fg outline-none",
            disabled && "opacity-60",
          )}
        />
      </div>
    </div>
  );
}

/** @param {HTMLDivElement | null} el */
export function readKbArticleEditorHtml(el) {
  if (!el) return "";
  const plain = el.innerText?.trim() ?? "";
  if (!plain) return "";
  return el.innerHTML ?? "";
}
