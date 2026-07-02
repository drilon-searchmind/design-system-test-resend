"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { TaskRichCommentEditor } from "@/components/tasks/task-rich-comment-editor";
import { databaseApiQuery } from "@/lib/crm/database-api-query";

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   avatar?: string;
 *   hue?: number;
 *   image?: string;
 * }} TeamWire
 */

/**
 * @typedef {{
 *   id: string;
 *   bodyHtml: string;
 *   createdAt: string;
 *   author?: TeamWire | null;
 * }} CommentWire
 */

/**
 * @param {{
 *   taskId: string;
 *   mode?: "demo" | "database";
 *   team?: TeamWire[];
 *   highlightCommentId?: string;
 * }} props
 */
export function TaskDetailCommentsSection({
  taskId,
  mode = "database",
  team = [],
  highlightCommentId = "",
}) {
  const [comments, setComments] = useState(/** @type {CommentWire[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [editorKey, setEditorKey] = useState(0);
  const didScrollRef = useRef(false);

  const load = useCallback(async () => {
    if (mode !== "database") return;
    setLoading(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/comments?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kommentarer");
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [mode, taskId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!highlightCommentId || didScrollRef.current || loading) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) {
      didScrollRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-agency-brand/40");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-agency-brand/40");
      }, 2400);
    }
  }, [comments, highlightCommentId, loading]);

  const handleSubmit = useCallback(
    async (bodyHtml) => {
      if (mode !== "database") return;
      setSubmitting(true);
      setError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/comments?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bodyHtml }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setEditorKey((k) => k + 1);
        window.dispatchEvent(new Event("crm-notifications-changed"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fejl");
      } finally {
        setSubmitting(false);
      }
    },
    [mode, taskId],
  );

  const mentionTeam = team.map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    hue: m.hue,
    image: m.image,
  }));

  return (
    <section id="task-comments" className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kommentarer</h2>
      {mode === "demo" ?
        <p className="mt-1 font-sans text-[12px] text-fg-muted">
          Kommentarer er kun tilgængelige i database-tilstand.
        </p>
      : null}

      <ul className="mt-4 flex flex-col gap-3">
        {loading ?
          <li className="text-[13px] text-fg-muted">Indlæser kommentarer…</li>
        : comments.length === 0 ?
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-6 text-center text-[13px] text-fg-muted">
            Ingen kommentarer endnu — vær den første.
          </li>
        : comments.map((c) => {
            const author = c.author;
            return (
              <li
                key={c.id}
                id={`comment-${c.id}`}
                className="scroll-mt-28 rounded-xl border border-border-soft bg-surface-muted/25 p-3 transition-shadow"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {author ?
                    <>
                      <CrmAvatar
                        label={author.avatar ?? author.name.slice(0, 2)}
                        src={author.image}
                        hue={author.hue ?? 220}
                        className="size-7 text-[9px]"
                        alt={author.name}
                      />
                      <span className="font-sans text-[12px] font-semibold text-fg">{author.name}</span>
                    </>
                  : (
                    <span className="font-sans text-[12px] font-semibold text-fg">Ukendt</span>
                  )}
                  <span className="text-fg-quiet">·</span>
                  <span className="text-[10px] tabular-nums text-fg-quiet">{c.createdAt}</span>
                </div>
                <div
                  className="task-comment-body mt-2 font-sans text-[13px] leading-relaxed text-fg-muted"
                  dangerouslySetInnerHTML={{ __html: c.bodyHtml }}
                />
              </li>
            );
          })
        }
      </ul>

      <div className="mt-5 border-t border-border-soft pt-4">
        {mode === "database" ?
          <TaskRichCommentEditor
            key={editorKey}
            team={mentionTeam}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        : null}
      </div>
    </section>
  );
}
