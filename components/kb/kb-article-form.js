"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { KbArticleRichEditor, readKbArticleEditorHtml } from "@/components/kb/kb-article-rich-editor";
import { KbEmojiPicker } from "@/components/kb/kb-emoji-picker";
import { KbTagPicker } from "@/components/kb/kb-tag-picker";
import { isSystemKnowledgeTag } from "@/lib/crm/knowledge-utils";
import { routes, kbArticleHref } from "@/config/routes";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   mode: "create" | "edit";
 *   article?: import("@/lib/crm/knowledge-utils").KnowledgeArticleView;
 *   tagSuggestions: string[];
 *   initialSectionId?: string;
 * }} props
 */
export function KbArticleForm({ mode, article, tagSuggestions, initialSectionId }) {
  const router = useRouter();
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const isEdit = mode === "edit";

  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [sectionId, setSectionId] = useState(() => {
    if (article?.sectionId && KNOWLEDGE_SECTIONS.some((s) => s.id === article.sectionId)) return article.sectionId;
    if (initialSectionId && KNOWLEDGE_SECTIONS.some((s) => s.id === initialSectionId)) return initialSectionId;
    return KNOWLEDGE_SECTIONS[0]?.id ?? "clickup";
  });
  const [tags, setTags] = useState(
    () => (article?.tags ?? []).filter((t) => !isSystemKnowledgeTag(t)),
  );
  const [audience, setAudience] = useState(article?.audience ?? "internal");
  const [icon, setIcon] = useState(/** @type {string | null} */ (article?.icon ?? null));
  const [headerImageUrl, setHeaderImageUrl] = useState(article?.headerImageUrl ?? "");
  const [featured, setFeatured] = useState(Boolean(article?.featured));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const submit = useCallback(
    async (publish) => {
      setSaving(true);
      setError(null);
      try {
        const bodyMd = readKbArticleEditorHtml(bodyRef.current);
        const qs = databaseApiQuery();
        const payload = {
          title,
          summary,
          bodyMd,
          sectionId,
          tags,
          audience,
          icon,
          headerImageUrl: headerImageUrl.trim() || null,
          featured,
          published: publish,
          archived: false,
        };

        const res = await fetch(
          isEdit ? `/api/kb/${encodeURIComponent(article?.slug ?? "")}?${qs}` : `/api/kb?${qs}`,
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
        const slug = typeof data?.article?.slug === "string" ? data.article.slug : article?.slug;
        if (slug) {
          router.push(kbArticleHref(slug));
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fejl");
        setSaving(false);
      }
    },
    [title, summary, sectionId, tags, audience, icon, headerImageUrl, featured, router, isEdit, article?.slug],
  );

  const archiveArticle = useCallback(async () => {
    if (!isEdit || !article?.slug) return;
    if (!window.confirm("Arkiver denne artikel? Den skjules fra live-visningen.")) return;
    setSaving(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/kb/${encodeURIComponent(article.slug)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true, published: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      router.push(routes.kb);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
      setSaving(false);
    }
  }, [isEdit, article?.slug, router]);

  const deleteArticle = useCallback(async () => {
    if (!isEdit || !article?.slug) return;
    if (!window.confirm("Slet artiklen permanent? Dette kan ikke fortrydes.")) return;
    setSaving(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/kb/${encodeURIComponent(article.slug)}?${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      router.push(routes.kb);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
      setSaving(false);
    }
  }, [isEdit, article?.slug, router]);

  const backHref = isEdit && article?.slug ? kbArticleHref(article.slug) : routes.kb;

  return (
    <form
      className="flex min-h-[calc(100vh-8rem)] flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-8 items-center rounded-md border border-border px-2.5 font-sans text-[12px] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            ← Tilbage
          </Link>
          <div>
            <h1 className="font-sans text-[18px] font-semibold text-fg">
              {isEdit ? "Rediger artikel" : "Ny artikel"}
            </h1>
            <p className="font-sans text-[11px] text-fg-muted">Brødteksten er hovedfokus — metadata i sidepanelet.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEdit ?
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void archiveArticle()}
                className={cn(
                  "rounded-md border border-border px-3 py-1.5 font-sans text-[12px] text-fg-muted hover:bg-surface-muted",
                  saving && "opacity-50",
                )}
              >
                Arkiver
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteArticle()}
                className={cn(
                  "rounded-md border border-agency-bad-border px-3 py-1.5 font-sans text-[12px] text-agency-bad hover:bg-agency-bad-soft",
                  saving && "opacity-50",
                )}
              >
                Slet
              </button>
            </>
          : null}
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={() => void submit(false)}
            className={cn(
              "rounded-md border border-border px-3 py-1.5 font-sans text-[12px] text-fg-muted hover:bg-surface-muted",
              (saving || !title.trim()) && "opacity-50",
            )}
          >
            Gem som kladde
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className={cn(
              "rounded-md border border-agency-brand-border bg-agency-brand px-3 py-1.5 font-sans text-[12px] font-medium text-canvas",
              (saving || !title.trim()) && "opacity-50",
            )}
          >
            {saving ? "Gemmer…" : isEdit ? "Gem ændringer" : "Publicer"}
          </button>
        </div>
      </header>

      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Artiklens titel"
        className="w-full border-0 bg-transparent font-sans text-[26px] font-semibold tracking-tight text-fg outline-none placeholder:text-fg-quiet md:text-[30px]"
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <KbArticleRichEditor
          editorRef={bodyRef}
          initialHtml={article?.bodyMd ?? ""}
          disabled={saving}
          className="min-h-[min(70vh,640px)]"
        />

        <aside className="tally-panel space-y-4 p-4 lg:sticky lg:top-4">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-fg-soft">Detaljer</h2>

          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Sektion *
            <select
              required
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
            >
              {KNOWLEDGE_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ? `${s.icon} ` : ""}
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Ikon
            <KbEmojiPicker value={icon} onChange={setIcon} disabled={saving} />
          </label>

          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Header-billede (URL)
            <input
              type="url"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              placeholder="https://…"
              className="h-8 rounded-md border border-border bg-surface-card px-2 text-[12px] text-fg"
            />
            {headerImageUrl.trim() ?
              <div className="mt-1 overflow-hidden rounded-lg border border-border-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerImageUrl.trim()} alt="" className="aspect-[16/9] w-full object-cover" />
              </div>
            : null}
          </label>

          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Målgruppe
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
            >
              <option value="internal">Intern</option>
              <option value="client">Kunde</option>
              <option value="public">Offentlig</option>
            </select>
          </label>

          <div className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Tags
            <KbTagPicker value={tags} onChange={setTags} suggestions={tagSuggestions} disabled={saving} />
          </div>

          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Kort resume
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Valgfrit — udfyldes fra brødtekst hvis tom"
              className="rounded-md border border-border bg-surface-card px-2 py-2 text-[12px] text-fg"
            />
          </label>

          <label className="inline-flex items-center gap-2 font-sans text-[12px] text-fg-muted">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Fremhæv på forsiden
          </label>
        </aside>
      </div>
    </form>
  );
}
