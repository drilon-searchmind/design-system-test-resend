"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { PulseIconChevronDown, PulseIconSearch } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes, workloadMemberHref } from "@/config/routes";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(160px,1.4fr)_minmax(52px,0.45fr)_minmax(52px,0.45fr)_minmax(44px,0.38fr)_minmax(44px,0.38fr)_minmax(44px,0.38fr)_minmax(120px,0.95fr)_minmax(72px,0.6fr)]";

/**
 * @param {{
 *   rows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 *   departments?: { id: string; name: string; short: string; color: string }[];
 * }} props
 */
export function WorkloadTeamDirectory({ rows, departments }) {
  const deptList =
    departments && departments.length > 0 ? departments : DEPARTMENTS.map((d) => ({ ...d, color: String(d.color) }));

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("load");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (!ql) return true;
      const dep = deptList.find((d) => d.id === r.member.dept);
      const hay = [r.member.name, r.member.role, dep?.name, r.member.dept].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(ql);
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "load") return b.loadIndex - a.loadIndex;
      if (sort === "open") return b.openCount - a.openCount;
      if (sort === "name") return a.member.name.localeCompare(b.member.name, "da");
      return 0;
    });
    return list;
  }, [q, sort, rows, deptList]);

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:px-4">
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">Team-belægning</h2>
          <p className="mt-1 max-w-xl font-sans text-[11px] text-fg-muted">
            Belægningsindeks fra åbne opgaver og disciplintal. Klik på navnet for månedlig detaljevisning. Søg og sorter sker lokalt på siden.
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:max-w-none md:flex-row md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[260px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg medarbejder…"
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
            active={sort}
            onChange={setSort}
            tabs={[
              { id: "load", label: "Belægning" },
              { id: "open", label: "Åbne" },
              { id: "name", label: "Navn" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className={cn(
              "grid gap-2 border-b border-border bg-surface-muted/85 px-3 py-2",
              "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
              GRID,
            )}
          >
            <span>Medarbejder</span>
            <span>Afd.</span>
            <span>Uge h</span>
            <button
              type="button"
              className="text-left font-[inherit] text-[inherit] hover:text-fg"
              onClick={() => setSort("open")}
            >
              Åbne {sort === "open" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
            </button>
            <span className="text-center">HP</span>
            <span className="text-center">Økr.</span>
            <button
              type="button"
              className="text-left font-[inherit] text-[inherit] hover:text-fg"
              onClick={() => setSort("load")}
            >
              Index {sort === "load" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
            </button>
            <span className="hidden sm:inline">Workload</span>
          </div>

          {filtered.map((r, i) => {
            const dep = deptList.find((d) => d.id === r.member.dept);
            return (
              <div
                key={r.member.id}
                className={cn(
                  "grid gap-2 border-b border-border-soft px-3 py-2 md:px-4 md:py-2.5",
                  GRID,
                  i === filtered.length - 1 && "border-0",
                  r.overdueCount > 0 && "bg-agency-bad-soft/15",
                  r.member.isMe && "bg-agency-brand-soft/10",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CrmAvatar label={r.member.avatar} hue={r.member.hue} className="size-8 text-[11px]" />
                  <div className="min-w-0">
                    <Link
                      href={workloadMemberHref(r.member.id)}
                      className="block truncate font-sans text-[13px] font-semibold leading-tight text-fg hover:text-agency-brand"
                    >
                      {r.member.name}
                    </Link>
                    <div className="truncate font-sans text-[10px] text-fg-quiet">{r.member.role}</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: dep?.color }}>
                  {dep?.short ?? r.member.dept}
                </span>
                <span className="text-[11px] tabular-nums text-fg">{r.member.weeklyHours}</span>
                <span className="text-[11px] tabular-nums text-fg">{r.openCount}</span>
                <span className="text-center text-[11px] tabular-nums text-fg">{r.highCount}</span>
                <span
                  className={cn(
                    "text-center text-[11px] tabular-nums",
                    r.overdueCount > 0 ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {r.overdueCount}
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-fg">{r.loadIndex}%</span>
                <PulseUtilBar hours={r.loadIndex} budget={100} className="hidden max-w-[120px] self-center sm:block" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <p className="font-sans text-[11px] text-fg-muted">
          Klik på navn for detaljevisning for rapportmåneden.
        </p>
        <Link href={routes.team} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Team-hub →
        </Link>
      </div>
    </section>
  );
}
