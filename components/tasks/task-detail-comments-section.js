"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { TaskRichCommentEditor } from "@/components/tasks/task-rich-comment-editor";
import { formatCommentDateTimeEn } from "@/lib/crm/format-da";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @param {Response} res
 */
async function readApiJson(res) {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!text.trim()) return {};
  if (!ct.includes("application/json")) {
    throw new Error(
      res.ok ?
        "Uventet svar fra serveren"
      : `Kunne ikke hente kommentarer (${res.status})`,
    );
  }
  try {
    return /** @type {Record<string, unknown>} */ (JSON.parse(text));
  } catch {
    throw new Error("Ugyldigt svar fra serveren");
  }
}

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
 *   createdAtIso?: string;
 *   author?: TeamWire | null;
 * }} CommentWire
 */

/**
 * @param {{
 *   taskId: string;
 *   mode?: "demo" | "database";
 *   team?: TeamWire[];
 *   highlightCommentId?: string;
 *   layout?: "default" | "sidebar";
 *   showHeading?: boolean;
 * }} props
 */
export function TaskDetailCommentsSection({
  taskId,
  mode = "database",
  team = [],
  highlightCommentId = "",
  layout = "default",
  showHeading = true,
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
      const res = await fetch(`/api/task-comments/${encodeURIComponent(taskId)}?${qs}`, {
        cache: "no-store",
      });
      const data = await readApiJson(res);
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
        const res = await fetch(`/api/task-comments/${encodeURIComponent(taskId)}?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bodyHtml }),
        });
        const data = await readApiJson(res);
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

  const isSidebar = layout === "sidebar";

  return (
    <section
      id="task-comments"
      className={cn(
        "flex min-w-0 flex-col overflow-hidden",
        isSidebar ?
          "max-h-[90vh] rounded-xl border border-border/60 bg-surface-muted/30 p-4 md:p-5"
        : "tally-panel p-4 md:p-5",
      )}
    >
      {showHeading ?
        <h2 className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Kommentarer
        </h2>
      : null}
      {mode === "demo" ?
        <p className={cn("shrink-0 font-sans text-[12px] text-fg-muted", showHeading && "mt-1")}>
          Kommentarer er kun tilgængelige i database-tilstand.
        </p>
      : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          showHeading || mode === "demo" ? "mt-3" : "",
        )}
      >
        <ul className="flex flex-col gap-3 pr-0.5">
          {loading ?
            <li className="text-[13px] text-fg-muted">Indlæser kommentarer…</li>
          : comments.length === 0 ?
            <li className="px-1 py-4 text-center text-[13px] text-fg-muted">
              Ingen kommentarer endnu — vær den første.
            </li>
          : comments.map((c) => {
              const author = c.author;
              return (
                <li
                  key={c.id}
                  id={`comment-${c.id}`}
                  className="scroll-mt-28 py-1 transition-shadow"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {author ?
                      <>
                        <CrmAvatar
                          label={author.avatar ?? author.name.slice(0, 2)}
                          src={author.image}
                          hue={author.hue ?? 220}
                          className="size-5 text-[8px]"
                          alt={author.name}
                        />
                        <span className="font-sans text-[12px] font-semibold text-fg">{author.name}</span>
                      </>
                    : (
                      <span className="font-sans text-[12px] font-semibold text-fg">Ukendt</span>
                    )}
                    <span className="text-fg-quiet">·</span>
                    <span className="text-[10px] tabular-nums text-fg-quiet">
                      {formatCommentDateTimeEn(c.createdAtIso || c.createdAt)}
                    </span>
                  </div>
                  <div
                    className="task-comment-body mt-1.5 font-sans text-[13px] leading-relaxed text-fg-muted"
                    dangerouslySetInnerHTML={{ __html: c.bodyHtml }}
                  />
                </li>
              );
            })
          }
        </ul>
      </div>

      <div className="mt-4 shrink-0 border-t border-border-soft pt-4">
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
