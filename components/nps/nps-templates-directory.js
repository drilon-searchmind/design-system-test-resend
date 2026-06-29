"use client";

import { useEffect, useState } from "react";

import { PulseIconChevronDown, PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   templates: { id: string; name: string; subject: string; body: string }[];
 *   headingId?: string;
 * }} props
 */
export function NpsTemplatesDirectory({ templates, headingId = "nps-templates-heading" }) {
  const [openId, setOpenId] = useState(/** @type {string | null} */ (templates[0]?.id ?? null));

  useEffect(() => {
    if (!templates.length) {
      setOpenId(null);
      return;
    }
    setOpenId((prev) => (prev && templates.some((t) => t.id === prev) ? prev : templates[0].id));
  }, [templates]);

  if (!templates.length) {
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
            Variabler som {"{{firstName}}"} og {"{{accountManager}}"} — sendes fra Resend-integration i produktion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            {templates.length} variant{templates.length === 1 ? "" : "er"}
          </span>
          <button
            type="button"
            disabled
            className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-border bg-surface-muted px-3 font-sans text-[11px] font-medium text-fg-quiet opacity-60"
            title="Opret via CRM (database)"
          >
            Ny skabelon +
          </button>
        </div>
      </div>

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
                    <span className="text-[10px] text-fg-muted">{t.id}</span>
                  </div>
                  <p className="mt-0.5 font-sans text-[12px] text-fg-muted">{t.subject}</p>
                </div>
              </button>

              {isOpen ? (
                <div className="border-t border-border-soft bg-agency-brand-soft/10 px-3 pb-3 pt-2 md:px-4 md:pb-3.5 md:pl-11">
                  <pre className="max-h-[240px] overflow-auto rounded-xl border border-border-soft bg-surface-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-fg-muted">
                    {t.body}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled
                      className="rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 py-1 font-sans text-[11px] font-medium text-agency-brand opacity-70"
                    >
                      Send test (låst)
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-md border border-border bg-surface-muted px-3 py-1 font-sans text-[11px] text-fg-muted opacity-70"
                    >
                      Kopiér HTML
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
