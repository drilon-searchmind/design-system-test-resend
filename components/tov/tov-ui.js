"use client";

import { cn } from "@/lib/utils";

export const tovBtn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand disabled:pointer-events-none disabled:opacity-50";

export const tovBtnPrimary =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-agency-brand-border bg-agency-brand px-3.5 font-sans text-[12px] font-semibold text-white transition-colors hover:bg-agency-brand/90 disabled:pointer-events-none disabled:opacity-50";

export const tovInput =
  "h-8 w-full rounded-md border border-border bg-surface-muted px-3 font-sans text-[13px] text-fg placeholder:text-fg-quiet outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

export const tovTextarea =
  "w-full rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] leading-relaxed text-fg placeholder:text-fg-quiet outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

const STATUS = {
  empty: { label: "Ingen profil", cls: "border-border bg-surface-muted text-fg-quiet" },
  analyzing: { label: "Analyserer…", cls: "border-agency-brand-border bg-agency-brand-soft text-agency-brand" },
  ready: { label: "Klar", cls: "border-agency-ok-border bg-agency-ok-soft text-agency-ok" },
  error: { label: "Fejl", cls: "border-agency-bad-border bg-agency-bad-soft text-agency-bad" },
};

/** @param {{ status: string; className?: string }} props */
export function TovStatusChip({ status, className }) {
  const s = STATUS[/** @type {keyof typeof STATUS} */ (status)] ?? STATUS.empty;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full border px-2 font-sans text-[11px] font-medium",
        s.cls,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

/** @param {{ title: string; hint?: string; actions?: import('react').ReactNode; children: import('react').ReactNode; className?: string }} props */
export function TovCard({ title, hint, actions, children, className }) {
  return (
    <section className={cn("tally-panel p-4 md:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{title}</h3>
          {hint ? <p className="mt-1 max-w-prose font-sans text-[12px] leading-snug text-fg-muted">{hint}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** @param {string} iso */
export function formatTovDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("da-DK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Small JSON fetch helper that surfaces `{error}` messages (and per-field `{fields}` as `err.fields`).
 * @param {string} url
 * @param {RequestInit & { json?: unknown }} [init]
 */
export async function tovFetch(url, init = {}) {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error ?? `Fejl (${res.status})`);
    if (data?.fields && typeof data.fields === "object") Object.assign(err, { fields: data.fields });
    throw err;
  }
  return data;
}

/**
 * Label + control + inline error for the Brand Core brief.
 * @param {{ id: string; label: string; optional?: boolean; error?: string; className?: string; children: import('react').ReactNode }} props
 */
export function TovField({ id, label, optional, error, className, children }) {
  return (
    <div className={className}>
      <label className="block font-sans text-[11px] font-medium text-fg-soft" htmlFor={id}>
        {label}
        {optional ?
          <span className="ml-1 font-normal text-fg-quiet">(valgfri)</span>
        : <span className="ml-0.5 text-agency-bad" aria-hidden>
            *
          </span>
        }
      </label>
      <div className="mt-1">{children}</div>
      {error ?
        <p id={`${id}-error`} className="mt-1 font-sans text-[11px] text-agency-bad">
          {error}
        </p>
      : null}
    </div>
  );
}

export const tovInvalid = "border-agency-bad-border focus-visible:ring-agency-bad";
