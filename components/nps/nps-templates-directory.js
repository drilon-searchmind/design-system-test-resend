"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PulseIconChevronDown, PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { NpsTemplateVariablesPicker } from "@/components/nps/nps-template-variables-picker";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { focusTextAtCursor, insertAtTextCursor } from "@/lib/ui/insert-at-text-cursor";
import { cn } from "@/lib/utils";

const DEFAULT_BODY = `Hej {{firstName}},

Vi vil rigtig gerne høre hvordan du oplever samarbejdet med Searchmind.
På en skala fra 0–10, hvor sandsynligt er det at du vil anbefale os til en kollega?

[ Klik her for at svare ]

Mvh
{{accountManager}}`;

/**
 * @param {{
 *   templates: { id: string; name: string; subject: string; body: string; isDefault?: boolean }[];
 *   onMutate?: () => void;
 *   canEdit?: boolean;
 *   headingId?: string;
 * }} props
 */
export function NpsTemplatesDirectory({
  templates,
  onMutate,
  canEdit = false,
  headingId = "nps-templates-heading",
}) {
  const [openId, setOpenId] = useState(/** @type {string | null} */ (templates[0]?.id ?? null));
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [form, setForm] = useState({
    key: "",
    name: "",
    subject: "Hvordan oplever du samarbejdet med Searchmind?",
    bodyMd: DEFAULT_BODY,
    isDefault: false,
  });
  const [activeField, setActiveField] = useState(/** @type {"subject" | "bodyMd"} */ ("bodyMd"));
  const subjectRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const bodyRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));

  const insertVariable = useCallback(
    (token) => {
      const field = activeField;
      if (field === "subject") {
        const el = subjectRef.current;
        if (!el) {
          setForm((f) => ({ ...f, subject: `${f.subject}${token}` }));
          return;
        }
        const { newValue, cursorPos } = insertAtTextCursor(el, token);
        setForm((f) => ({ ...f, subject: newValue }));
        requestAnimationFrame(() => focusTextAtCursor(el, cursorPos));
        return;
      }

      const el = bodyRef.current;
      if (!el) {
        setForm((f) => ({ ...f, bodyMd: `${f.bodyMd}${token}` }));
        return;
      }
      const { newValue, cursorPos } = insertAtTextCursor(el, token);
      setForm((f) => ({ ...f, bodyMd: newValue }));
      requestAnimationFrame(() => focusTextAtCursor(el, cursorPos));
    },
    [activeField],
  );

  useEffect(() => {
    if (!templates.length) {
      setOpenId(null);
      return;
    }
    setOpenId((prev) => (prev && templates.some((t) => t.id === prev) ? prev : templates[0].id));
  }, [templates]);

  const setDefault = useCallback(
    async (templateKey) => {
      if (!canEdit) return;
      setSaving(templateKey);
      setError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/nps/templates/${encodeURIComponent(templateKey)}?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
        onMutate?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fejl");
      } finally {
        setSaving(null);
      }
    },
    [canEdit, onMutate],
  );

  const createTemplate = useCallback(async () => {
    if (!canEdit) return;
    setSaving("create");
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/nps/templates?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      setShowCreate(false);
      setForm({
        key: "",
        name: "",
        subject: "Hvordan oplever du samarbejdet med Searchmind?",
        bodyMd: DEFAULT_BODY,
        isDefault: false,
      });
      onMutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setSaving(null);
    }
  }, [canEdit, form, onMutate]);

  if (!templates.length && !canEdit) {
    return (
      <section className="tally-panel overflow-hidden">
        <div className="border-b border-border px-3 py-3 md:px-4">
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            E-mailskabeloner
          </h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Ingen skabeloner i denne visning.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div>
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            E-mailskabeloner
          </h2>
          <p className="mt-1 max-w-xl font-sans text-[11px] text-fg-muted">
            Én standard-skabelon bruges når konto ikke har egen tildeling. Variabler indsættes ved
            oprettelse — se listen under formularen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            {templates.length} variant{templates.length === 1 ? "" : "er"}
          </span>
          {canEdit ?
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[11px] font-medium text-agency-brand hover:opacity-90"
            >
              {showCreate ? "Annuller" : "Ny skabelon +"}
            </button>
          : null}
        </div>
      </div>

      {error ?
        <p className="border-b border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      {showCreate && canEdit ?
        <div className="space-y-3 border-b border-border bg-surface-muted/30 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
              Nøgle (unik)
              <input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
                placeholder="fx. q2-followup"
              />
            </label>
            <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
              Navn
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Emne
            <input
              ref={subjectRef}
              value={form.subject}
              onFocus={() => setActiveField("subject")}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
            />
          </label>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <label className="flex min-w-0 flex-col gap-1 font-sans text-[11px] text-fg-muted">
              Brødtekst (markdown/plain)
              <textarea
                ref={bodyRef}
                value={form.bodyMd}
                onFocus={() => setActiveField("bodyMd")}
                onChange={(e) => setForm((f) => ({ ...f, bodyMd: e.target.value }))}
                rows={8}
                className="min-w-0 rounded-md border border-border bg-surface-card px-2 py-2 text-[12px] text-fg"
              />
            </label>
            <NpsTemplateVariablesPicker
              onInsert={insertVariable}
              className="min-w-0 lg:sticky lg:top-4 lg:self-start"
            />
          </div>
          <label className="inline-flex items-center gap-2 font-sans text-[12px] text-fg-muted">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Sæt som standard-skabelon
          </label>
          <button
            type="button"
            disabled={saving === "create" || !form.key.trim()}
            onClick={() => void createTemplate()}
            className="rounded-md border border-agency-brand-border bg-agency-brand px-3 py-1.5 font-sans text-[12px] font-medium text-canvas disabled:opacity-50"
          >
            {saving === "create" ? "Gemmer…" : "Opret skabelon"}
          </button>
        </div>
      : null}

      <ul className="divide-y divide-border-soft">
        {templates.map((t) => {
          const isOpen = openId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : t.id)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-3.5",
                  isOpen && "bg-agency-brand-soft/15",
                )}
              >
                <span className="mt-1 shrink-0 text-fg-quiet">
                  {isOpen ? <PulseIconChevronDown size={14} /> : <PulseIconChevronRight size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-sans text-[13px] font-semibold text-fg">{t.name}</span>
                    {t.isDefault ?
                      <span className="rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-agency-brand">
                        Standard
                      </span>
                    : null}
                  </div>
                  <p className="mt-0.5 font-sans text-[12px] text-fg-muted">{t.subject}</p>
                </div>
              </button>

              {isOpen ?
                <div className="border-t border-border-soft bg-agency-brand-soft/10 px-3 pb-3 pt-2 md:px-4 md:pb-3.5 md:pl-11">
                  <pre className="max-h-[240px] overflow-auto rounded-xl border border-border-soft bg-surface-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-fg-muted">
                    {t.body}
                  </pre>
                  {canEdit ?
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!t.isDefault ?
                        <button
                          type="button"
                          disabled={saving === t.id}
                          onClick={() => void setDefault(t.id)}
                          className="rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 py-1 font-sans text-[11px] font-medium text-agency-brand disabled:opacity-50"
                        >
                          {saving === t.id ? "Gemmer…" : "Sæt som standard"}
                        </button>
                      : null}
                    </div>
                  : null}
                </div>
              : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
