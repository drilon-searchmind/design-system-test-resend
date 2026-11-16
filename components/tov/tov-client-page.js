"use client";

import Link from "next/link";

import { StickyPageHeader } from "@/components/crm/sticky-page-header";
import { TovWorkspace } from "@/components/tov/tov-workspace";
import { routes } from "@/config/routes";

/** Selvstændig side: /tov/[kunde]. */
export function TovClientPage({ clientKey }) {
  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link href={routes.tov} className="text-fg-muted transition-colors hover:text-agency-brand hover:underline">
          Tone of Voice
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <Link
          href={`${routes.clients}/${encodeURIComponent(clientKey)}`}
          className="text-fg transition-colors hover:text-agency-brand hover:underline"
        >
          Åbn kundekort →
        </Link>
      </nav>
      <StickyPageHeader className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Tone of Voice</p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">{decodeURIComponent(clientKey)}</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            Upload materiale, vælg model og få en standardiseret Tone of Voice-profil.
          </p>
        </div>
      </StickyPageHeader>
      <TovWorkspace clientKey={clientKey} />
    </>
  );
}
