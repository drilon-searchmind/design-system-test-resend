"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{ domains: import('@/lib/crm/domains-data').ClientDomain[] }} props
 */
export function ClientDetailDomainsCard({ domains }) {
  const [open, setOpen] = useState(true);

  if (!domains.length) return null;

  return (
    <div className="tally-panel px-4 py-3 md:px-5 md:py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Domæner &amp; sproglag
        </h2>
        <span className="font-sans text-[11px] tabular-nums text-fg-quiet">{domains.length}</span>
      </button>

      {open ? (
        <ul className="mt-3 space-y-2">
          {domains.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border-soft bg-surface-muted/30 px-3 py-2 text-[12px]"
            >
              <span className="font-medium text-fg">{d.domain}</span>
              <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                {d.locale}
              </span>
              {d.cms ? (
                <span className="text-[11px] text-fg-muted">{d.cms}</span>
              ) : null}
              {d.isPrimary ? (
                <span
                  className={cn(
                    "rounded-full border border-agency-brand-border/50 bg-agency-brand-soft/40",
                    "px-2 py-0.5 text-[10px] font-medium text-agency-brand",
                  )}
                >
                  Primær
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
