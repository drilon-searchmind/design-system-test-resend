"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PulseIconChevronDown,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { routes } from "@/config/routes";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { NPS_INTERVAL_DA } from "@/lib/crm/nps-intervals-da";
import { npsLatestEntry, npsPreviousEntry } from "@/lib/crm/nps-utils";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(140px,1.5fr)_minmax(56px,0.42fr)_minmax(56px,0.42fr)_minmax(44px,0.35fr)_minmax(150px,1.1fr)_minmax(118px,1fr)_minmax(88px,0.55fr)]";

function scoreToneClass(s) {
  if (s == null) return "text-fg-quiet";
  if (s >= 50) return "text-agency-ok";
  if (s >= 40) return "text-agency-warn";
  return "text-agency-bad";
}

/**
 * @param {{
 *   clients: import('@/lib/crm/static-data').CLIENTS;
 *   headingId?: string;
 * }} props
 */
export function NpsClientsDirectory({ clients, headingId = "nps-clients-directory" }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [density, setDensity] = useState("list");

  const rows = useMemo(() => {
    return clients.map((c) => {
      const latest = npsLatestEntry(c);
      const prev = npsPreviousEntry(c);
      const delta = latest && prev ? latest.score - prev.score : null;
      const spark = (c.npsHistory ?? []).map((e) => e.score);
      const intervalKey = c.npsInterval;
      const cadence =
        intervalKey && intervalKey in NPS_INTERVAL_DA
          ? NPS_INTERVAL_DA[/** @type {keyof typeof NPS_INTERVAL_DA} */ (intervalKey)]
          : c.npsInterval ?? "—";
      const atRisk = latest != null && latest.score < 40;
      const improving = delta != null && delta >= 2;
      const noData = !latest;

      return { client: c, latest, delta, spark, cadence, atRisk, improving, noData };
    });
  }, [clients]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      const ql = q.trim().toLowerCase();
      if (
        ql &&
        !r.client.name.toLowerCase().includes(ql) &&
        !r.client.industry.toLowerCase().includes(ql) &&
        !r.cadence.toLowerCase().includes(ql)
      ) {
        return false;
      }
      if (filter === "atRisk" && !r.atRisk) return false;
      if (filter === "improving" && !r.improving) return false;
      if (filter === "noData" && !r.noData) return false;
      return true;
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "score") {
        const as = a.latest?.score ?? -1;
        const bs = b.latest?.score ?? -1;
        return bs - as;
      }
      if (sort === "delta") {
        const ad = a.delta ?? -999;
        const bd = b.delta ?? -999;
        return bd - ad;
      }
      return a.client.name.localeCompare(b.client.name, "da");
    });
    return list;
  }, [rows, q, filter, sort]);

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <div>
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            Konti · NPS-oversigt
          </h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Aktiv + pauseret — krydslink til fuldt kundekort.</p>
        </div>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} vist
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[200px] flex-1 md:max-w-[260px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg konto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <PulseSegmentedControl
            size="sm"
            active={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "atRisk", label: "< 40" },
              { id: "improving", label: "+2" },
              { id: "noData", label: "Ingen måling" },
            ]}
          />

          <PulseSegmentedControl
            size="sm"
            active={density}
            onChange={setDensity}
            tabs={[
              { id: "list", label: "", icon: () => <PulseIconList size={12} /> },
              { id: "cards", label: "", icon: () => <PulseIconGrid size={12} /> },
            ]}
          />
        </div>
      </div>

      {density === "cards" ? (
        <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {filtered.map((r) => (
            <article
              key={r.client.id}
              className={cn(
                "flex flex-col rounded-2xl border border-border-soft bg-surface-muted/35 p-3.5",
                r.atRisk && "border-agency-bad-border/35",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`${routes.clients}/${r.client.id}`}
                  className="font-sans text-[14px] font-semibold text-fg hover:text-agency-brand hover:underline"
                >
                  {r.client.name}
                </Link>
                <HealthChip health={r.client.health} palette="agency" compact />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusChip status={r.client.status} palette="agency" />
              </div>
              <p className="mt-2 font-sans text-[11px] text-fg-muted">{r.cadence}</p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className={cn("text-[26px] font-semibold tabular-nums leading-none", scoreToneClass(r.latest?.score ?? null))}>
                  {r.latest?.score ?? "—"}
                </span>
                {r.delta != null ? (
                  <span className={cn("text-[12px] tabular-nums", r.delta >= 0 ? "text-agency-ok" : "text-agency-bad")}>
                    {r.delta > 0 ? "+" : ""}
                    {r.delta} vs sidst
                  </span>
                ) : null}
              </div>
              {r.spark.length > 2 ? (
                <div className="mt-2 text-agency-brand">
                  <PulseSparkline data={r.spark} height={34} />
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-fg-quiet">For få punkter til graf</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className={cn(
                "grid gap-2 border-b border-border bg-surface-muted/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button
                type="button"
                className="text-left font-[inherit] hover:text-fg"
                onClick={() => setSort("name")}
              >
                Konto {sort === "name" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button type="button" className="text-left font-[inherit] hover:text-fg" onClick={() => setSort("score")}>
                Score {sort === "score" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Δ</span>
              <span className="text-center">H</span>
              <span>Trend</span>
              <span>Cyklus</span>
              <span className="text-center">Drift</span>
            </div>
            {filtered.map((r, i) => (
              <div
                key={r.client.id}
                className={cn(
                  "grid gap-2 border-b border-border-soft px-3 py-2 md:gap-3 md:px-4 md:py-2.5",
                  GRID,
                  i === filtered.length - 1 && "border-b-0",
                  r.atRisk && "bg-agency-bad-soft/12",
                  r.noData && "opacity-85",
                )}
              >
                <div className="min-w-0">
                  <Link
                    href={`${routes.clients}/${r.client.id}`}
                    className="truncate font-sans text-[12px] font-semibold leading-snug text-fg hover:text-agency-brand hover:underline"
                  >
                    {r.client.name}
                  </Link>
                  <span className="block text-[10px] text-fg-quiet">{r.client.industry}</span>
                </div>
                <span className={cn("text-[13px] font-semibold tabular-nums", scoreToneClass(r.latest?.score ?? null))}>
                  {r.latest?.score ?? "—"}
                </span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    r.delta == null ? "text-fg-quiet" : r.delta >= 0 ? "text-agency-ok" : "text-agency-bad",
                  )}
                >
                  {r.delta == null ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta}`}
                </span>
                <div className="flex justify-center">
                  <HealthChip health={r.client.health} palette="agency" compact />
                </div>
                <div className="flex min-h-[34px] items-center text-agency-brand">
                  {r.spark.length > 2 ? <PulseSparkline data={r.spark} height={28} /> : <span className="text-[10px] text-fg-quiet">—</span>}
                </div>
                <p className="line-clamp-2 font-sans text-[11px] leading-snug text-fg-muted">{r.cadence}</p>
                <StatusChip status={r.client.status} palette="agency" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
