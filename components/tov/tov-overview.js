"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StickyPageHeader } from "@/components/crm/sticky-page-header";
import { PulseIconSearch } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TovStatusChip, formatTovDate, tovFetch } from "@/components/tov/tov-ui";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/** Oversigt over alle kunder og deres Tone of Voice. */
export function TovOverview() {
  const [rows, setRows] = useState(/** @type {Array<Record<string, any>> | null} */ (null));
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    tovFetch("/api/tov")
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Fejl"));
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      all: list.length,
      ready: list.filter((r) => r.status === "ready").length,
      missing: list.filter((r) => r.status !== "ready").length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (filter === "ready" && r.status !== "ready") return false;
      if (filter === "missing" && r.status === "ready") return false;
      return !ql || r.client.name.toLowerCase().includes(ql);
    });
  }, [rows, q, filter]);

  return (
    <>
      <StickyPageHeader className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kunde</p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">Tone of Voice</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            Én standardiseret Tone of Voice pr. kunde — bygget af brandbøger, mails og websites. {counts.ready} af{" "}
            {counts.all} kunder har en profil.
          </p>
        </div>
      </StickyPageHeader>

      <section className="tally-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:items-center md:px-4">
          <label className="relative flex min-w-0 max-w-[280px] flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søg kunde…"
              className="h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3 font-sans text-[13px] text-fg placeholder:text-fg-quiet outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
            />
          </label>
          <PulseSegmentedControl
            size="sm"
            active={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "Alle", count: counts.all },
              { id: "ready", label: "Med profil", count: counts.ready },
              { id: "missing", label: "Mangler", count: counts.missing },
            ]}
          />
        </div>

        {error ?
          <p className="px-4 py-6 text-[13px] text-agency-bad">{error}</p>
        : !rows ?
          <div className="h-[240px] animate-pulse bg-skeleton" />
        : filtered.length === 0 ?
          <p className="px-4 py-10 text-center text-[13px] text-fg-muted">Ingen kunder matcher.</p>
        : <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(180px,1.6fr)_110px_80px_90px_minmax(140px,1fr)_28px] gap-3 border-b border-border bg-surface-muted/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4">
                <span>Kunde</span>
                <span>Status</span>
                <span>Kilder</span>
                <span>Sikkerhed</span>
                <span>Sidst analyseret</span>
                <span />
              </div>
              {filtered.map((r, i) => (
                <Link
                  key={r.client.id}
                  href={`${routes.tov}/${encodeURIComponent(r.client.id)}`}
                  className={cn(
                    "grid grid-cols-[minmax(180px,1.6fr)_110px_80px_90px_minmax(140px,1fr)_28px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-muted md:px-4",
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-border text-[10.5px] font-semibold text-white"
                      style={{ background: `oklch(62% 0.14 ${r.client.hue})` }}
                    >
                      {r.client.logo}
                    </span>
                    <span className="truncate font-sans text-[13px] font-medium text-fg">{r.client.name}</span>
                  </div>
                  <TovStatusChip status={r.status} className="justify-self-start" />
                  <span className="font-sans text-[12px] tabular-nums text-fg-muted">{r.sourceCount}</span>
                  <span className="font-sans text-[12px] tabular-nums text-fg-muted">
                    {r.confidence != null ? `${r.confidence}/100` : "—"}
                  </span>
                  <span className="truncate font-sans text-[12px] text-fg-muted">{formatTovDate(r.analyzedAt)}</span>
                  <span className="text-fg-quiet">›</span>
                </Link>
              ))}
            </div>
          </div>}
      </section>
    </>
  );
}
