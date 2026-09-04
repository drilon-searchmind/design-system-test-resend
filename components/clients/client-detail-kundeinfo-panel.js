"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { KbArticleBody } from "@/components/kb/kb-article-body";
import { KbArticleRichEditor, readKbArticleEditorHtml } from "@/components/kb/kb-article-rich-editor";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   clientSlug: string;
 *   clientName: string;
 *   infoMd?: string;
 *   canEdit?: boolean;
 *   onSaved?: (infoMd: string) => void;
 * }} props
 */
export function ClientDetailKundeinfoPanel({
  clientSlug,
  clientName,
  infoMd = "",
  canEdit = false,
  onSaved,
}) {
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [savedHtml, setSavedHtml] = useState(infoMd);

  useEffect(() => {
    if (!editing) setSavedHtml(infoMd);
  }, [infoMd, editing]);

  const displayHtml = savedHtml;

  const startEdit = useCallback(() => {
    setError(null);
    setEditing(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setError(null);
    setEditing(false);
  }, []);

  const save = useCallback(async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const nextInfoMd = readKbArticleEditorHtml(bodyRef.current);
      const qs = databaseApiQuery();
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ infoMd: nextInfoMd || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");

      setSavedHtml(nextInfoMd);
      setEditing(false);
      onSaved?.(nextInfoMd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gem");
    } finally {
      setSaving(false);
    }
  }, [canEdit, clientSlug, onSaved]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[13px] leading-relaxed text-fg-muted">
            Intern kundewiki for {clientName}. Samme redigeringsformat som vidensbasen — brødtekst med
            overskrifter, lister og formatering.
          </p>
        </div>
        {canEdit ?
          <div className="flex flex-wrap items-center gap-2">
            {editing ?
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEdit}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
                >
                  Annuller
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-canvas transition-colors hover:bg-agency-brand/90 disabled:opacity-50"
                >
                  {saving ? "Gemmer…" : "Gem kundeinfo"}
                </button>
              </>
            : (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand transition-colors hover:bg-agency-brand-soft/80"
              >
                Rediger kundeinfo
              </button>
            )}
          </div>
        : (
          <p className="font-sans text-[11px] text-fg-quiet">Demo — redigering kræver database-tilstand.</p>
        )}
      </div>

      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      {editing ?
        <KbArticleRichEditor
          key={`edit-${displayHtml.length}-${clientSlug}`}
          editorRef={bodyRef}
          initialHtml={displayHtml}
          placeholder="Skriv kundeinfo, procedurer, kontekst og noter…"
          className="min-h-[min(60vh,520px)]"
        />
      : (
        <article className="tally-panel min-w-0 overflow-hidden">
          <div className="p-4 md:p-[length:var(--ds-studio-pad-main)]">
            {displayHtml.trim() ?
              <KbArticleBody bodyMd={displayHtml} />
            : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <p className="font-sans text-[14px] font-medium text-fg">Ingen kundeinfo endnu</p>
                <p className="max-w-md font-sans text-[13px] text-fg-muted">
                  {canEdit ?
                    "Tilføj kontekst om kunden — mål, kontakter, særhensyn, links og interne noter."
                  : "Skift til database-tilstand for at oprette kundeinfo."}
                </p>
                {canEdit ?
                  <button
                    type="button"
                    onClick={startEdit}
                    className={cn(
                      "mt-2 inline-flex h-9 items-center rounded-lg border border-agency-brand-border",
                      "bg-agency-brand-soft px-4 font-sans text-[12px] font-semibold text-agency-brand",
                    )}
                  >
                    Skriv kundeinfo
                  </button>
                : null}
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
