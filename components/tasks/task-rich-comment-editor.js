"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { cn } from "@/lib/utils";

/**
 * @typedef {{ id: string; name: string; avatar?: string; hue?: number; image?: string }} MentionMember
 */

/**
 * @param {{
 *   team: MentionMember[];
 *   submitting?: boolean;
 *   error?: string | null;
 *   onSubmit: (bodyHtml: string) => void;
 *   placeholder?: string;
 * }} props
 */
export function TaskRichCommentEditor({
  team,
  submitting = false,
  error = null,
  onSubmit,
  placeholder = "Skriv en kommentar… Brug @ for at nævne kolleger.",
}) {
  const editorRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    const list = Array.isArray(team) ? team : [];
    if (!q) return list.slice(0, 8);
    return list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionQuery, team]);

  const exec = useCallback((cmd, val) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }, []);

  const detectMention = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setMentionOpen(false);
      return;
    }
    const text = node.textContent ?? "";
    const upto = text.slice(0, range.startOffset);
    const at = upto.lastIndexOf("@");
    if (at === -1 || /\s/.test(upto.slice(at + 1))) {
      setMentionOpen(false);
      return;
    }
    setMentionQuery(upto.slice(at + 1));
    setMentionOpen(true);
    setMentionIndex(0);
  }, []);

  const insertMention = useCallback((member) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent ?? "";
    const upto = text.slice(0, range.startOffset);
    const at = upto.lastIndexOf("@");
    if (at === -1) return;

    const queryText = upto.slice(at + 1);
    const before = text.slice(0, at);
    let after = text.slice(range.startOffset);

    // Drop duplicate name fragments left after picking from the @-menu (e.g. "@dbr" + "ilon Braha").
    const nameLower = member.name.toLowerCase();
    const queryLower = queryText.toLowerCase();
    if (queryLower && nameLower.startsWith(queryLower) && after) {
      const tail = nameLower.slice(queryLower.length);
      if (tail && after.toLowerCase().startsWith(tail)) {
        after = after.slice(tail.length);
      }
    }

    node.textContent = before;

    const span = document.createElement("span");
    span.className = "mention";
    span.setAttribute("data-member-key", member.id);
    span.setAttribute("contenteditable", "false");
    span.textContent = `@${member.name}`;

    const space = document.createTextNode("\u00a0");
    const afterNode = document.createTextNode(after);

    const parent = node.parentNode;
    if (!parent) return;
    parent.insertBefore(span, node.nextSibling);
    parent.insertBefore(space, span.nextSibling);
    parent.insertBefore(afterNode, space.nextSibling);

    if (node.textContent === "") parent.removeChild(node);

    const newRange = document.createRange();
    newRange.setStart(afterNode, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionOpen(false);
    setMentionQuery("");
    el.focus();
  }, []);

  useEffect(() => {
    if (!mentionOpen) return;
    function onKey(e) {
      if (!mentionOpen || !filtered.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && mentionOpen) {
        e.preventDefault();
        insertMention(filtered[mentionIndex]);
      } else if (e.key === "Escape") {
        setMentionOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, insertMention, mentionIndex, mentionOpen]);

  const submit = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    const plain = editorRef.current?.innerText?.trim() ?? "";
    if (!plain) return;
    onSubmit(html);
  }, [onSubmit]);

  return (
    <div className="flex flex-col gap-2">
      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <div className="rounded-xl border border-border bg-surface-muted/40">
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
              onMouseDown={(e) => {
                e.preventDefault();
                exec(b.cmd);
              }}
              className="inline-flex size-7 items-center justify-center rounded-md border border-transparent font-sans text-[12px] font-semibold text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg"
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            title="Punktopstilling"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("insertUnorderedList");
            }}
            className="inline-flex h-7 items-center rounded-md border border-transparent px-2 font-sans text-[11px] text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg"
          >
            • Liste
          </button>
        </div>

        <div className="relative p-3">
          <div
            ref={editorRef}
            contentEditable={!submitting}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder={placeholder}
            onInput={detectMention}
            className={cn(
              "task-comment-editor min-h-[96px] max-h-[240px] overflow-y-auto font-sans text-[13px] leading-relaxed text-fg outline-none",
              submitting && "opacity-60",
            )}
          />

          {mentionOpen && filtered.length ?
            <div className="absolute bottom-full left-3 z-20 mb-1 w-[min(280px,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-border bg-canvas shadow-lg">
              <p className="border-b border-border-soft px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                Nævn kollega
              </p>
              <ul className="max-h-44 overflow-y-auto py-1">
                {filtered.map((m, i) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(m);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-sans text-[12px]",
                        i === mentionIndex ? "bg-agency-brand-soft text-agency-brand" : "text-fg hover:bg-surface-muted",
                      )}
                    >
                      <CrmAvatar
                        label={m.avatar ?? m.name.slice(0, 2)}
                        src={m.image}
                        hue={m.hue ?? 220}
                        className="size-6 text-[9px]"
                      />
                      <span className="truncate font-medium">{m.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          : null}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className={cn(
            "inline-flex h-9 items-center rounded-md border border-agency-brand-border bg-agency-brand px-4",
            "font-sans text-[12px] font-semibold text-white transition-colors hover:bg-agency-brand/90 disabled:opacity-45",
          )}
        >
          {submitting ? "Gemmer…" : "Send kommentar"}
        </button>
      </div>
    </div>
  );
}
