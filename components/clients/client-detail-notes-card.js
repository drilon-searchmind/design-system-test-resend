"use client";

import Link from "next/link";

import { ClientNoteAddForm, ClientNoteRow } from "@/components/clients/client-notes-list";
import { routes } from "@/config/routes";
import { TEAM } from "@/lib/crm/static-data";

const PREVIEW_COUNT = 5;

/**
 * @param {{
 *   notes: import('@/lib/crm/client-notes').ClientNoteItem[];
 *   teamMembers?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   clientSlug: string;
 *   canCreate?: boolean;
 *   disabledHint?: string;
 *   onCreated?: () => void;
 *   showAllHref?: string | null;
 * }} props `showAllHref` = null skjuler "Vis alle" (fx kundegrupper). `canCreate` styrer også
 *   om rettigheds-tjekkede Redigér/Slet vises (fra i demo og på kundegrupper).
 */
export function ClientDetailNotesCard({
  notes,
  teamMembers,
  clientSlug,
  canCreate = false,
  disabledHint,
  onCreated,
  showAllHref,
}) {
  const roster = teamMembers?.length ? teamMembers : TEAM;
  const allHref =
    showAllHref === null ? null : (showAllHref ?? `${routes.clients}/${encodeURIComponent(clientSlug)}/notes`);
  const preview = notes.slice(0, PREVIEW_COUNT);

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Seneste noter</h2>
        {allHref ?
          <Link href={allHref} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
            Vis alle →
          </Link>
        : null}
      </div>
      <div className="mt-3">
        <ClientNoteAddForm
          clientSlug={clientSlug}
          canCreate={canCreate}
          disabledHint={disabledHint}
          onCreated={onCreated}
          compact
        />
      </div>
      <ul className="mt-3 flex flex-col gap-3 font-sans text-sm">
        {preview.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-6 text-center text-[13px] text-fg-muted">
            Ingen noter endnu.
          </li>
        ) : (
          preview.map((n) => (
            <ClientNoteRow
              key={n.id}
              note={n}
              roster={roster}
              clientSlug={clientSlug}
              editable={canCreate}
              onDeleted={onCreated}
            />
          ))
        )}
      </ul>
    </div>
  );
}
