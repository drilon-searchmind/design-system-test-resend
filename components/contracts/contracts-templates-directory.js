"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ContractTemplateVariablesPicker } from "@/components/contracts/contract-template-variables-picker";
import { PulseIconChevronDown, PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import {
  CONTRACT_TYPE_OPTIONS,
  emptyContractTemplateDraft,
} from "@/lib/crm/contract-template-defaults";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { focusTextAtCursor, insertAtTextCursor } from "@/lib/ui/insert-at-text-cursor";
import { cn } from "@/lib/utils";

/** @typedef {"subject" | "emailBodyMd" | "documentBodyMd"} ActiveField */

/**
 * @typedef {object} ContractTemplateRow
 * @property {string} id
 * @property {string} key
 * @property {string} name
 * @property {string} subject
 * @property {string} emailBodyMd
 * @property {string} documentBodyMd
 * @property {string} defaultType
 * @property {number} defaultNoticeDays
 * @property {boolean} active
 * @property {boolean} isDefault
 * @property {string} [updatedAt]
 */

/**
 * @param {{
 *   templates: ContractTemplateRow[];
 *   onMutate?: () => void;
 *   canEdit?: boolean;
 *   loading?: boolean;
 * }} props
 */
export function ContractsTemplatesDirectory({
  templates,
  onMutate,
  canEdit = false,
  loading = false,
}) {
  const defaults = emptyContractTemplateDraft();
  const [openId, setOpenId] = useState(/** @type {string | null} */ (templates[0]?.id ?? null));
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [activeField, setActiveField] = useState(/** @type {ActiveField} */ ("emailBodyMd"));
  const [createForm, setCreateForm] = useState({
    key: "",
    name: "",
    ...defaults,
    isDefault: false,
  });
  const [editDraft, setEditDraft] = useState(/** @type {ContractTemplateRow | null} */ (null));

  const subjectRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const emailRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));
  const documentRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));

  useEffect(() => {
    if (!templates.length) {
      setOpenId(null);
      setEditDraft(null);
      return;
    }
    setOpenId((prev) => (prev && templates.some((t) => t.id === prev) ? prev : templates[0].id));
  }, [templates]);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === openId);
    setEditDraft(tpl ? { ...tpl } : null);
  }, [openId, templates]);

  const insertVariable = useCallback(
    (token) => {
      const field = activeField;
      const ref =
        field === "subject" ? subjectRef
        : field === "emailBodyMd" ? emailRef
        : documentRef;

      /** @param {Record<string, unknown>} prev */
      const applyTo = (prev, key) => {
        const el = ref.current;
        if (!el || !("value" in el)) {
          return { ...prev, [key]: `${String(prev[key] ?? "")}${token}` };
        }
        const { newValue, cursorPos } = insertAtTextCursor(el, token);
        requestAnimationFrame(() => focusTextAtCursor(el, cursorPos));
        return { ...prev, [key]: newValue };
      };

      if (showCreate) {
        setCreateForm((f) => applyTo(f, field));
        return;
      }
      if (editDraft) {
        setEditDraft((d) => (d ? applyTo(d, field) : d));
      }
    },
    [activeField, editDraft, showCreate],
  );

  const createTemplate = useCallback(async () => {
    if (!canEdit) return;
    setSaving("create");
    setError(null);
    try {
      const qs = databaseApiQuery();
      const key =
        createForm.key.trim() ||
        createForm.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      const res = await fetch(`/api/contract-templates?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: createForm.name.trim(),
          subject: createForm.subject.trim(),
          emailBodyMd: createForm.emailBodyMd,
          documentBodyMd: createForm.documentBodyMd,
          defaultType: createForm.defaultType,
          defaultNoticeDays: createForm.defaultNoticeDays,
          isDefault: createForm.isDefault || templates.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      setShowCreate(false);
      setCreateForm({ key: "", name: "", ...emptyContractTemplateDraft(), isDefault: false });
      onMutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setSaving(null);
    }
  }, [canEdit, createForm, onMutate, templates.length]);

  const saveEdit = useCallback(async () => {
    if (!canEdit || !editDraft) return;
    setSaving(editDraft.id);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/contract-templates/${encodeURIComponent(editDraft.id)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          subject: editDraft.subject.trim(),
          emailBodyMd: editDraft.emailBodyMd,
          documentBodyMd: editDraft.documentBodyMd,
          defaultType: editDraft.defaultType,
          defaultNoticeDays: editDraft.defaultNoticeDays,
          active: editDraft.active,
          isDefault: editDraft.isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      onMutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setSaving(null);
    }
  }, [canEdit, editDraft, onMutate]);

  const setDefault = useCallback(
    async (templateId) => {
      if (!canEdit) return;
      setSaving(`default-${templateId}`);
      setError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/contract-templates/${encodeURIComponent(templateId)}?${qs}`, {
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

  const deleteTemplate = useCallback(
    async (templateId, templateName) => {
      if (!canEdit) return;
      if (!window.confirm(`Slet skabelonen «${templateName}»? Dette kan ikke fortrydes.`)) return;
      setSaving(`delete-${templateId}`);
      setError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/contract-templates/${encodeURIComponent(templateId)}?${qs}`, {
          method: "DELETE",
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

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">Kontraktskabeloner</h2>
          <p className="mt-1 max-w-2xl font-sans text-[11px] text-fg-muted">
            E-mail og kontrakttekst ved udsendelse til underskrift. Variabler erstattes automatisk —
            link og adgangskode indsættes kun i e-mailen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            {templates.length} skabelon{templates.length === 1 ? "" : "er"}
          </span>
          {canEdit ?
            <button
              type="button"
              onClick={() => {
                setShowCreate((v) => !v);
                setError(null);
              }}
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

      {loading ?
        <p className="px-4 py-6 font-sans text-[12px] text-fg-muted">Indlæser skabeloner…</p>
      : null}

      {showCreate && canEdit ?
        <TemplateEditorForm
          name={createForm.name}
          templateKey={createForm.key}
          subject={createForm.subject}
          emailBodyMd={createForm.emailBodyMd}
          documentBodyMd={createForm.documentBodyMd}
          defaultType={createForm.defaultType}
          defaultNoticeDays={createForm.defaultNoticeDays}
          isDefault={createForm.isDefault}
          active={true}
          showKey
          showActive={false}
          saving={saving === "create"}
          saveLabel="Opret skabelon"
          onNameChange={(v) => setCreateForm((f) => ({ ...f, name: v }))}
          onKeyChange={(v) => setCreateForm((f) => ({ ...f, key: v }))}
          onSubjectChange={(v) => setCreateForm((f) => ({ ...f, subject: v }))}
          onEmailChange={(v) => setCreateForm((f) => ({ ...f, emailBodyMd: v }))}
          onDocumentChange={(v) => setCreateForm((f) => ({ ...f, documentBodyMd: v }))}
          onDefaultTypeChange={(v) => setCreateForm((f) => ({ ...f, defaultType: v }))}
          onNoticeDaysChange={(v) => setCreateForm((f) => ({ ...f, defaultNoticeDays: v }))}
          onIsDefaultChange={(v) => setCreateForm((f) => ({ ...f, isDefault: v }))}
          onActiveChange={() => {}}
          onSave={() => void createTemplate()}
          onSetActiveField={setActiveField}
          subjectRef={subjectRef}
          emailRef={emailRef}
          documentRef={documentRef}
          variablesPicker={
            <ContractTemplateVariablesPicker onInsert={insertVariable} activeField={activeField} />
          }
        />
      : null}

      {!loading && !templates.length && !canEdit ?
        <p className="px-4 py-6 font-sans text-[12px] text-fg-muted">
          Skabeloner kræver database-kilde.
        </p>
      : null}

      {!loading && !templates.length && canEdit && !showCreate ?
        <p className="px-4 py-6 font-sans text-[12px] text-fg-muted">
          Ingen skabeloner endnu — opret den første, eller send en kontrakt (standard oprettes automatisk).
        </p>
      : null}

      <ul className="divide-y divide-border-soft">
        {templates.map((t) => {
          const isOpen = openId === t.id;
          const isEditing = isOpen && editDraft?.id === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : t.id)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                  isOpen && "bg-agency-brand-soft/15",
                )}
              >
                <span className="mt-1 shrink-0 text-fg-quiet">
                  {isOpen ?
                    <PulseIconChevronDown size={14} />
                  : <PulseIconChevronRight size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[13px] font-semibold text-fg">{t.name}</span>
                    {t.isDefault ?
                      <span className="rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-agency-brand">
                        Standard
                      </span>
                    : null}
                    {!t.active ?
                      <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-fg-muted">
                        Inaktiv
                      </span>
                    : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-fg-quiet">{t.key}</p>
                  <p className="mt-1 font-sans text-[12px] text-fg-muted">{t.subject}</p>
                </div>
              </button>

              {isOpen && isEditing && editDraft ?
                <div className="border-t border-border-soft bg-agency-brand-soft/10">
                  <TemplateEditorForm
                    name={editDraft.name}
                    templateKey={editDraft.key}
                    subject={editDraft.subject}
                    emailBodyMd={editDraft.emailBodyMd}
                    documentBodyMd={editDraft.documentBodyMd}
                    defaultType={editDraft.defaultType}
                    defaultNoticeDays={editDraft.defaultNoticeDays}
                    isDefault={editDraft.isDefault}
                    active={editDraft.active}
                    showKey={false}
                    showActive
                    saving={saving === editDraft.id}
                    saveLabel="Gem ændringer"
                    onNameChange={(v) => setEditDraft((d) => (d ? { ...d, name: v } : d))}
                    onKeyChange={() => {}}
                    onSubjectChange={(v) => setEditDraft((d) => (d ? { ...d, subject: v } : d))}
                    onEmailChange={(v) => setEditDraft((d) => (d ? { ...d, emailBodyMd: v } : d))}
                    onDocumentChange={(v) => setEditDraft((d) => (d ? { ...d, documentBodyMd: v } : d))}
                    onDefaultTypeChange={(v) => setEditDraft((d) => (d ? { ...d, defaultType: v } : d))}
                    onNoticeDaysChange={(v) => setEditDraft((d) => (d ? { ...d, defaultNoticeDays: v } : d))}
                    onIsDefaultChange={(v) => setEditDraft((d) => (d ? { ...d, isDefault: v } : d))}
                    onActiveChange={(v) => setEditDraft((d) => (d ? { ...d, active: v } : d))}
                    onSave={() => void saveEdit()}
                    onSetActiveField={setActiveField}
                    subjectRef={subjectRef}
                    emailRef={emailRef}
                    documentRef={documentRef}
                    variablesPicker={
                      <ContractTemplateVariablesPicker
                        onInsert={insertVariable}
                        activeField={activeField}
                      />
                    }
                    footer={
                      canEdit ?
                        <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
                          {!t.isDefault ?
                            <button
                              type="button"
                              disabled={Boolean(saving)}
                              onClick={() => void setDefault(t.id)}
                              className="rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5 font-sans text-[11px] font-medium text-agency-brand disabled:opacity-50"
                            >
                              {saving === `default-${t.id}` ? "Gemmer…" : "Sæt som standard"}
                            </button>
                          : null}
                          <button
                            type="button"
                            disabled={Boolean(saving)}
                            onClick={() => void deleteTemplate(t.id, t.name)}
                            className="rounded-md border border-agency-bad-border px-3 py-1.5 font-sans text-[11px] font-medium text-agency-bad disabled:opacity-50"
                          >
                            {saving === `delete-${t.id}` ? "Sletter…" : "Slet skabelon"}
                          </button>
                        </div>
                      : null
                    }
                  />
                </div>
              : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * @param {{
 *   name: string;
 *   templateKey: string;
 *   subject: string;
 *   emailBodyMd: string;
 *   documentBodyMd: string;
 *   defaultType: string;
 *   defaultNoticeDays: number;
 *   isDefault: boolean;
 *   active: boolean;
 *   showKey?: boolean;
 *   showActive?: boolean;
 *   saving?: boolean;
 *   saveLabel: string;
 *   onNameChange: (v: string) => void;
 *   onKeyChange: (v: string) => void;
 *   onSubjectChange: (v: string) => void;
 *   onEmailChange: (v: string) => void;
 *   onDocumentChange: (v: string) => void;
 *   onDefaultTypeChange: (v: string) => void;
 *   onNoticeDaysChange: (v: number) => void;
 *   onIsDefaultChange: (v: boolean) => void;
 *   onActiveChange: (v: boolean) => void;
 *   onSave: () => void;
 *   onSetActiveField: (f: ActiveField) => void;
 *   subjectRef: React.RefObject<HTMLInputElement | null>;
 *   emailRef: React.RefObject<HTMLTextAreaElement | null>;
 *   documentRef: React.RefObject<HTMLTextAreaElement | null>;
 *   variablesPicker: React.ReactNode;
 *   footer?: React.ReactNode;
 * }} props
 */
function TemplateEditorForm({
  name,
  templateKey,
  subject,
  emailBodyMd,
  documentBodyMd,
  defaultType,
  defaultNoticeDays,
  isDefault,
  active,
  showKey = false,
  showActive = false,
  saving = false,
  saveLabel,
  onNameChange,
  onKeyChange,
  onSubjectChange,
  onEmailChange,
  onDocumentChange,
  onDefaultTypeChange,
  onNoticeDaysChange,
  onIsDefaultChange,
  onActiveChange,
  onSave,
  onSetActiveField,
  subjectRef,
  emailRef,
  documentRef,
  variablesPicker,
  footer,
}) {
  const canSave = name.trim() && subject.trim() && emailBodyMd.trim() && documentBodyMd.trim();

  return (
    <div className="space-y-4 border-b border-border bg-surface-muted/30 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
          Navn
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
          />
        </label>
        {showKey ?
          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Nøgle (unik)
            <input
              value={templateKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder="auto fra navn"
              className="h-9 rounded-md border border-border bg-surface-card px-2 font-mono text-[12px] text-fg"
            />
          </label>
        : null}
        {!showKey ?
          <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
            Nøgle
            <input
              value={templateKey}
              readOnly
              className="h-9 cursor-default rounded-md border border-border bg-surface-muted px-2 font-mono text-[12px] text-fg-muted"
            />
          </label>
        : null}
        <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
          Standard aftaletype
          <select
            value={defaultType}
            onChange={(e) => onDefaultTypeChange(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
          >
            {CONTRACT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
          Opsigelsesvarsel (dage)
          <input
            type="number"
            min={0}
            value={defaultNoticeDays}
            onChange={(e) => onNoticeDaysChange(Number(e.target.value) || 0)}
            className="h-9 rounded-md border border-border bg-surface-card px-2 text-[13px] tabular-nums text-fg"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 font-sans text-[11px] text-fg-muted">
        E-mail emne
        <input
          ref={subjectRef}
          value={subject}
          onFocus={() => onSetActiveField("subject")}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
        />
      </label>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_240px]">
        <label className="flex min-w-0 flex-col gap-1 font-sans text-[11px] text-fg-muted">
          E-mail brødtekst
          <textarea
            ref={emailRef}
            value={emailBodyMd}
            onFocus={() => onSetActiveField("emailBodyMd")}
            onChange={(e) => onEmailChange(e.target.value)}
            rows={12}
            className="min-h-[200px] min-w-0 rounded-md border border-border bg-surface-card px-2 py-2 font-mono text-[11px] leading-relaxed text-fg"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 font-sans text-[11px] text-fg-muted">
          Kontrakttekst (vises ved underskrift)
          <textarea
            ref={documentRef}
            value={documentBodyMd}
            onFocus={() => onSetActiveField("documentBodyMd")}
            onChange={(e) => onDocumentChange(e.target.value)}
            rows={12}
            className="min-h-[200px] min-w-0 rounded-md border border-border bg-surface-card px-2 py-2 font-mono text-[11px] leading-relaxed text-fg"
          />
        </label>
        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">{variablesPicker}</div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 font-sans text-[12px] text-fg-muted">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onIsDefaultChange(e.target.checked)}
          />
          Standard-skabelon
        </label>
        {showActive ?
          <label className="inline-flex items-center gap-2 font-sans text-[12px] text-fg-muted">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => onActiveChange(e.target.checked)}
            />
            Aktiv (kan vælges ved send)
          </label>
        : null}
      </div>

      <button
        type="button"
        disabled={saving || !canSave}
        onClick={onSave}
        className="rounded-md border border-agency-brand-border bg-agency-brand px-4 py-2 font-sans text-[12px] font-medium text-canvas disabled:opacity-50"
      >
        {saving ? "Gemmer…" : saveLabel}
      </button>

      {footer}
    </div>
  );
}
