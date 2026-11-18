"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { taskHref } from "@/config/routes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import {
  NOTE_BODY_MAX,
  NOTE_TYPE_LABELS,
  NOTE_TYPE_OPTIONS,
  canManageNote,
  noteSourceLabel,
} from "@/lib/crm/client-notes";
import { cn } from "@/lib/utils";

const actionCls =
  "font-sans text-[11px] font-medium text-fg-quiet hover:text-fg hover:underline disabled:opacity-50";

/**
 * @param {{
 *   note: import('@/lib/crm/client-notes').ClientNoteItem;
 *   roster: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   clientSlug?: string;
 *   editable?: boolean;
 *   onDeleted?: () => void;
 * }} props `editable` = datakilden er database (demo er skrivebeskyttet); rettigheder tjekkes pr. note.
 */
export function ClientNoteRow({ note, roster, clientSlug, editable = false, onDeleted }) {
  const { data: session } = useSession();
  const [local, setLocal] = useState(/** @type {{ body: string; type: string } | null} */ (null));
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [draftType, setDraftType] = useState("note");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const n = local ? { ...note, ...local } : note;
  const canManage =
    editable &&
    Boolean(clientSlug) &&
    canManageNote(n, { userId: session?.user?.id, isAdmin: session?.user?.isAdmin === true });
  const noteUrl = `/api/clients/${encodeURIComponent(clientSlug ?? "")}/notes/${encodeURIComponent(n.id)}?${databaseApiQuery()}`;

  const startEdit = () => {
    setDraftBody(n.body);
    setDraftType(NOTE_TYPE_OPTIONS.some((o) => o.value === n.type) ? n.type : "note");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const body = draftBody.trim();
    if (!body) return;
    const prev = local;
    setLocal({ body, type: draftType });
    setEditing(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(noteUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, type: draftType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme note");
    } catch (e) {
      setLocal(prev);
      setEditing(true);
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Slet denne note? Det kan ikke fortrydes.")) return;
    setDeleted(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(noteUrl, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke slette note");
      onDeleted?.();
    } catch (e) {
      setDeleted(false);
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  };

  if (deleted) return null;

  const author = n.who ? roster.find((t) => t.id === n.who) : undefined;
  const authorName = author?.name ?? n.authorName ?? (n.who || "Ukendt forfatter");
  const kind = n.kind ?? "note";
  return (
    <li className="rounded-xl border border-border-soft bg-surface-muted/25 p-3 transition-colors hover:border-agency-brand-border/40">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <CrmAvatar
            label={author?.avatar ?? authorName.slice(0, 2)}
            src={author?.image}
            hue={author?.hue ?? 220}
            className="size-6 text-[8px]"
          />
          <span className="font-sans text-[12px] font-medium text-fg">{authorName}</span>
        </div>
        <span className="text-fg-quiet">·</span>
        <span className="text-[10px] tabular-nums text-fg-quiet">{n.at}</span>
        <span
          className={cn(
            "rounded-md border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
            n.type === "alert" && "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
            n.type === "call" && "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
            n.type === "meeting" && "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
            !["alert", "call", "meeting"].includes(n.type) && "border-border bg-surface-muted text-fg-muted",
          )}
        >
          {NOTE_TYPE_LABELS[n.type] ?? n.type}
        </span>
        {canManage && !editing ?
          <span className="ml-auto flex items-center gap-3">
            <button type="button" onClick={startEdit} disabled={busy} className={actionCls}>
              Redigér
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className={cn(actionCls, "text-agency-bad hover:text-agency-bad")}
            >
              Slet
            </button>
          </span>
        : null}
      </div>
      {editing ?
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="mt-2"
        >
          <label className="sr-only" htmlFor={`note-edit-${n.id}`}>
            Rediger note
          </label>
          <textarea
            id={`note-edit-${n.id}`}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            disabled={busy}
            maxLength={NOTE_BODY_MAX}
            rows={3}
            autoFocus
            className="w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2 font-sans text-[13px] text-fg outline-none placeholder:text-fg-quiet focus-visible:ring-2 focus-visible:ring-agency-brand disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              disabled={busy}
              aria-label="Notetype"
              className="h-8 rounded-md border border-border bg-surface-muted px-2 font-sans text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand disabled:opacity-60"
            >
              {NOTE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="ml-auto inline-flex h-8 items-center rounded-md border border-border px-3 font-sans text-[12px] font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={busy || !draftBody.trim()}
              className="inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-canvas disabled:opacity-50"
            >
              Gem
            </button>
          </div>
        </form>
      : <p className="mt-2 whitespace-pre-line leading-relaxed text-[13px] text-fg-muted">{n.body}</p>}
      {error ?
        <p className="mt-2 rounded-md border border-agency-bad-border bg-agency-bad-soft px-2 py-1.5 font-sans text-[11px] text-agency-bad">
          {error}
        </p>
      : null}
      <p className="mt-2 font-sans text-[10.5px] text-fg-quiet">
        Kilde:{" "}
        {kind === "task_comment" && n.taskId ?
          <Link href={taskHref(n.taskId)} className="text-agency-brand hover:underline">
            {noteSourceLabel({ kind, source: n.source, taskTitle: n.taskTitle })}
          </Link>
        : noteSourceLabel({ kind, source: n.source, taskTitle: n.taskTitle })}
      </p>
    </li>
  );
}

/**
 * Inline-formular til manuel note (POST /api/clients/<slug>/notes).
 * @param {{
 *   clientSlug: string;
 *   canCreate: boolean;
 *   disabledHint?: string;
 *   onCreated?: () => void;
 *   compact?: boolean;
 * }} props
 */
export function ClientNoteAddForm({ clientSlug, canCreate, disabledHint, onCreated, compact = false }) {
  const [body, setBody] = useState("");
  const [type, setType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/notes?${databaseApiQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme note");
      setBody("");
      setType("note");
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-xl border border-border-soft bg-surface-muted/30 p-3"
    >
      <label className="sr-only" htmlFor={`note-body-${clientSlug}`}>
        Ny note
      </label>
      <textarea
        id={`note-body-${clientSlug}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={!canCreate || saving}
        maxLength={NOTE_BODY_MAX}
        rows={compact ? 2 : 3}
        placeholder={canCreate ? "Tilføj en note — fx referat af opkald eller møde…" : disabledHint}
        className="w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2 font-sans text-[13px] text-fg outline-none placeholder:text-fg-quiet focus-visible:ring-2 focus-visible:ring-agency-brand disabled:opacity-60"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={!canCreate || saving}
          aria-label="Notetype"
          className="h-8 rounded-md border border-border bg-surface-muted px-2 font-sans text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand disabled:opacity-60"
        >
          {NOTE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!canCreate && disabledHint ?
          <span className="font-sans text-[11px] text-fg-quiet">{disabledHint}</span>
        : null}
        <button
          type="submit"
          disabled={!canCreate || saving || !body.trim()}
          className="ml-auto inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-canvas disabled:opacity-50"
        >
          {saving ? "Gemmer…" : "Tilføj note"}
        </button>
      </div>
      {error ?
        <p className="mt-2 rounded-md border border-agency-bad-border bg-agency-bad-soft px-2 py-1.5 font-sans text-[11px] text-agency-bad">
          {error}
        </p>
      : null}
    </form>
  );
}
