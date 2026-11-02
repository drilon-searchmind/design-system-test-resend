"use client";

import { useState } from "react";

import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";
import { databaseApiQuery } from "@/lib/crm/database-api-query";

/**
 * Omdøb en koncern (hovedkundens navn). Gemmes i `ClientGroup`.
 * @param {{ cvr: string; name: string; onRenamed: () => void | Promise<void> }} props
 */
export function ClientGroupRename({ cvr, name, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  async function save() {
    const next = draft.trim();
    if (!next) {
      setError("Navn er påkrævet");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/koncern/${encodeURIComponent(cvr)}?${databaseApiQuery()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      setEditing(false);
      await onRenamed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand transition-colors hover:bg-agency-brand-soft/80"
      >
        Omdøb koncern
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          aria-label="Koncernnavn"
          className={clientEditInputClass}
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 font-sans text-[12px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg disabled:opacity-50"
        >
          Annuller
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-canvas hover:bg-agency-brand/90 disabled:opacity-50"
        >
          {saving ? "Gemmer…" : "Gem"}
        </button>
      </div>
      {error ? <span className="font-sans text-[11px] text-agency-bad">{error}</span> : null}
    </div>
  );
}
