"use client";

import { useEffect, useId, useRef, useState } from "react";

import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * PATCH /api/clients/<slug> — kaster med serverens fejlbesked (fx admin-only felter).
 * @param {string} clientSlug
 * @param {Record<string, unknown>} patch
 */
export async function patchClient(clientSlug, patch) {
  const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}?${databaseApiQuery()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");
  return data;
}

const inputCls =
  "h-8 w-full rounded-md border border-border bg-surface-muted px-2.5 text-[12.5px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

/**
 * @typedef {{
 *   name: string;
 *   label: string;
 *   type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'select';
 *   options?: Array<{ value: string; label: string }>;
 *   placeholder?: string;
 *   required?: boolean;
 * }} QuickEditField
 */

/**
 * Klik på en værdi → lille popover-editor. Bruges til personer, kontakter og redigerbare metrics.
 * Uden `canEdit` renderes triggeren uændret (med `disabledHint` som tooltip).
 *
 * @param {{
 *   title: string;
 *   canEdit: boolean;
 *   disabledHint?: string;
 *   fields: QuickEditField[];
 *   initialValues: Record<string, string>;
 *   onSubmit: (values: Record<string, string>) => Promise<void>;
 *   onRemove?: () => Promise<void>;
 *   removeLabel?: string;
 *   hint?: string;
 *   align?: 'left' | 'right';
 *   className?: string;
 *   triggerClassName?: string;
 *   children: import('react').ReactNode;
 * }} props
 */
export function QuickEditPopover({
  title,
  canEdit,
  disabledHint,
  fields,
  initialValues,
  onSubmit,
  onRemove,
  removeLabel = "Fjern",
  hint,
  align = "left",
  className,
  triggerClassName,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const rootRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) setOpen(false);
    };
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canEdit) {
    return (
      <span className={className} title={disabledHint}>
        {children}
      </span>
    );
  }

  const openEditor = () => {
    setValues(initialValues);
    setError(null);
    setOpen(true);
  };

  /** @param {() => Promise<void>} action */
  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl ved gem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openEditor())}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={`Redigér ${title.toLowerCase()}`}
        className={cn(
          "inline-flex max-w-full cursor-pointer items-center rounded-md text-left outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-agency-brand",
          triggerClassName,
        )}
      >
        {children}
      </button>
      {open ?
        <form
          id={panelId}
          role="dialog"
          aria-label={title}
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => onSubmit(values));
          }}
          className={cn(
            "absolute top-full z-50 mt-1.5 w-[min(300px,calc(100vw-2rem))] rounded-xl border border-border bg-canvas p-3 text-left shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{title}</p>
          <div className="mt-2 flex flex-col gap-2">
            {fields.map((f, i) => (
              <label key={f.name} className="flex flex-col gap-1 font-sans text-[11px] text-fg-soft">
                {f.label}
                {f.type === "select" ?
                  <select
                    className={inputCls}
                    value={values[f.name] ?? ""}
                    autoFocus={i === 0}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                : <input
                    className={cn(inputCls, f.type === "number" && "tabular-nums")}
                    type={f.type === "number" ? "text" : (f.type ?? "text")}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={values[f.name] ?? ""}
                    autoFocus={i === 0}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  />
                }
              </label>
            ))}
          </div>
          {hint ? <p className="mt-2 font-sans text-[10.5px] leading-snug text-fg-quiet">{hint}</p> : null}
          {error ?
            <p className="mt-2 rounded-md border border-agency-bad-border bg-agency-bad-soft px-2 py-1.5 font-sans text-[11px] text-agency-bad">
              {error}
            </p>
          : null}
          <div className="mt-3 flex items-center gap-2">
            {onRemove ?
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(onRemove)}
                className="mr-auto inline-flex h-8 items-center rounded-md border border-agency-bad-border px-2.5 font-sans text-[12px] font-medium text-agency-bad hover:bg-agency-bad-soft disabled:opacity-50"
              >
                {removeLabel}
              </button>
            : <span className="mr-auto" />}
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-md border border-border px-2.5 font-sans text-[12px] font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-canvas disabled:opacity-50"
            >
              {busy ? "Gemmer…" : "Gem"}
            </button>
          </div>
        </form>
      : null}
    </span>
  );
}

/** @param {string} raw */
export function parseQuickNumber(raw) {
  const s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : NaN;
}

export const QUICK_EDIT_DEMO_HINT = "Demo-data kan ikke redigeres — skift til database for at redigere.";
