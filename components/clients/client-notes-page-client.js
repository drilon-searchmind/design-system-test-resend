"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ClientNoteAddForm, ClientNoteRow } from "@/components/clients/client-notes-list";
import { useDataSource } from "@/components/crm/use-data-source";
import { routes } from "@/config/routes";
import { demoNoteItems } from "@/lib/crm/client-notes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { CLIENTS, NOTES_BY_CLIENT, TEAM } from "@/lib/crm/static-data";

/** Database-feedet har allerede forfatternavn; avatar falder tilbage til initialer. */
const NO_ROSTER = /** @type {import('@/lib/crm/pulse-types').PulseTeamMember[]} */ ([]);

/**
 * Alle noter for én kunde (`/clients/<slug>/notes`), nyeste først, med kilde, forfatter og dato.
 * @param {{ clientSlug: string }} props
 */
export function ClientNotesPageClient({ clientSlug }) {
  const dataSource = useDataSource();
  const [remote, setRemote] = useState(
    /** @type {{ client: { id: string; name: string }; notes: import('@/lib/crm/client-notes').ClientNoteItem[] } | null} */ (null),
  );
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/notes?${databaseApiQuery()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente noter");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [clientSlug]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void load();
    });
  }, [dataSource, load]);

  const demoClient = dataSource === "demo" ? CLIENTS.find((c) => c.id === clientSlug) : undefined;
  const clientName = demoClient?.name ?? remote?.client.name ?? (loading ? "Indlæser…" : "Kunde");
  const notes =
    dataSource === "demo" ? demoNoteItems(NOTES_BY_CLIENT[clientSlug] ?? []) : (remote?.notes ?? []);
  const roster = dataSource === "demo" ? TEAM : NO_ROSTER;
  const visible =
    typeFilter === "all" ? notes
    : typeFilter === "task_comment" ? notes.filter((n) => n.kind === "task_comment")
    : notes.filter((n) => n.kind !== "task_comment" && n.type === typeFilter);
  const clientHref = `${routes.clients}/${encodeURIComponent(clientSlug)}`;
  const canWrite = dataSource === "database" && Boolean(remote);

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link href={routes.clients} className="hover:text-agency-brand hover:underline">
          Kunder
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <Link href={clientHref} className="hover:text-agency-brand hover:underline">
          {clientName}
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-fg">Noter</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kunde</p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">Noter · {clientName}</h1>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            Manuelle noter og kommentarer fra kundens opgaver, nyeste først.
          </p>
        </div>
        <label className="flex items-center gap-2 font-sans text-[12px] text-fg-muted">
          Vis
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface-muted px-2 text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
          >
            <option value="all">Alle ({notes.length})</option>
            <option value="note">Noter</option>
            <option value="call">Opkald</option>
            <option value="meeting">Møder</option>
            <option value="alert">Advarsler</option>
            <option value="task_comment">Opgavekommentarer</option>
          </select>
        </label>
      </header>

      {dataSource === "demo" && !demoClient ?
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen kunde med id <span className="text-fg">{clientSlug}</span>.
        </p>
      : <div className="tally-panel flex flex-col gap-4 p-4 md:p-5">
          <ClientNoteAddForm
            clientSlug={clientSlug}
            canCreate={canWrite}
            disabledHint={
              dataSource === "demo" ? "Noter kan kun tilføjes, når datakilden er database." : "Indlæser kunde…"
            }
            onCreated={() => void load()}
          />
          {error ?
            <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
              {error}
            </p>
          : null}
          {loading && !remote ?
            <div className="h-40 animate-pulse rounded-xl bg-skeleton" />
          : visible.length === 0 ?
            <p className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-8 text-center font-sans text-[13px] text-fg-muted">
              Ingen noter at vise.
            </p>
          : <ul className="flex flex-col gap-3 font-sans text-sm">
              {visible.map((n) => (
                <ClientNoteRow
                  key={n.id}
                  note={n}
                  roster={roster}
                  clientSlug={clientSlug}
                  editable={canWrite}
                  onDeleted={() => void load()}
                />
              ))}
            </ul>
          }
        </div>
      }
    </div>
  );
}
