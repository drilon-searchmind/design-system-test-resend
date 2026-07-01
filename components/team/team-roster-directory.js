"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { memberProfileHref, routes } from "@/config/routes";
import { DEPARTMENTS as DEMO_DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(200px,2.1fr)_minmax(120px,1.1fr)_minmax(46px,0.4fr)_minmax(44px,0.42fr)_minmax(44px,0.42fr)_minmax(44px,0.42fr)_minmax(56px,0.5fr)_minmax(120px,0.92fr)_36px]";

/**
 * @param {{
 *   teamRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 *   departments?: { id: string; name: string; short: string; color?: string; capacity?: number }[];
 *   headingId?: string;
 *   initialDeptId?: string;
 * }} props
 */
export function TeamRosterDirectory({
  teamRows,
  departments: departmentsProp,
  headingId = "team-roster-heading",
  initialDeptId,
}) {
  const departments = Array.isArray(departmentsProp) && departmentsProp.length ? departmentsProp : DEMO_DEPARTMENTS;
  const [q, setQ] = useState("");
  const [dept, setDept] = useState(initialDeptId ?? "all");
  const [sort, setSort] = useState("load");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = teamRows.filter((r) => {
      if (dept !== "all") {
        const keys = Array.isArray(r.member.disciplineKeys) ? r.member.disciplineKeys : [r.member.dept];
        if (!keys.includes(dept)) return false;
      }
      if (!ql) return true;
      const d = departments.find((x) => x.id === r.member.dept);
      const hay = `${r.member.name} ${r.member.role} ${d?.name ?? ""}`.toLowerCase();
      return hay.includes(ql);
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "name") return a.member.name.localeCompare(b.member.name, "da");
      if (sort === "open") return b.openCount - a.openCount;
      return b.loadIndex - a.loadIndex;
    });
    return list;
  }, [teamRows, q, dept, sort, departments]);

  return (
    <section
      id="team-roster"
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-start md:justify-between md:px-4 md:py-4">
        <div className="max-w-xl">
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            Rosterindeks
          </h2>
          <p className="mt-1 font-sans text-[11px] leading-snug text-fg-muted">
            Medarbejdere med afdeling og belægning fra åbne board-opgaver — klik videre til profilkort. Brug{" "}
            <span className="text-fg-quiet">?dept=</span> fra Workload-filter.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-none md:w-auto md:flex-1 md:flex-row md:justify-end md:gap-2">
          <label className="relative flex min-w-0 max-w-full flex-1 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Navn, rolle, disciplin…"
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

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-soft bg-surface-muted/30 px-3 py-2 md:px-4">
        <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Disciplin</span>
        <button
          type="button"
          onClick={() => setDept("all")}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
            dept === "all"
              ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-border bg-surface-card text-fg-muted hover:text-fg",
          )}
        >
          Alle
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDept(d.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
              dept === d.id
                ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                : "border-border bg-surface-card text-fg-muted hover:text-fg",
            )}
          >
            {d.short}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div
            className={cn(
              "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
              "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
              GRID,
            )}
          >
            <span>Medarbejder</span>
            <span>Rolle</span>
            <span>Afd.</span>
            <button
              type="button"
              className="text-center font-[inherit] text-[inherit] hover:text-fg"
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
            <span />
          </div>

          {filtered.map((r, i) => {
            const d = departments.find((x) => x.id === r.member.dept);
            const extraDisciplines = Array.isArray(r.member.disciplineKeys)
              ? r.member.disciplineKeys.filter((k) => k && k !== r.member.dept)
              : [];
            const deptLabel =
              extraDisciplines.length > 0 ?
                `${d?.short ?? r.member.dept} +${extraDisciplines.length}`
              : (d?.short ?? r.member.dept);
            return (
              <Link
                key={r.member.id}
                href={memberProfileHref(r.member)}
                className={cn(
                  "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                  GRID,
                  i < filtered.length - 1 && "border-b border-border-soft",
                  r.overdueCount > 0 && "bg-agency-bad-soft/10",
                  r.member.isMe && "bg-agency-brand-soft/10",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CrmAvatar
                    label={r.member.avatar}
                    src={r.member.image}
                    hue={r.member.hue}
                    className="size-8 text-[11px]"
                  />
                  <div className="min-w-0">
                    <span className="truncate font-sans text-[13px] font-semibold text-fg">{r.member.name}</span>
                    <div className="text-[10px] text-fg-quiet">
                      {r.member.weeklyHours} h/uge
                      {r.member.isMe ? (
                        <span className="text-agency-brand"> · dig</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <span className="truncate self-center font-sans text-[12px] text-fg-muted">{r.member.role}</span>
                <span
                  className="self-center text-[11px] font-semibold tabular-nums"
                  style={{ color: d?.color ?? "var(--fg-muted)" }}
                  title={
                    Array.isArray(r.member.disciplineKeys) && r.member.disciplineKeys.length > 1
                      ? r.member.disciplineKeys.join(", ")
                      : undefined
                  }
                >
                  {deptLabel}
                </span>
                <span className="self-center text-center text-[11px] tabular-nums text-fg">{r.openCount}</span>
                <span className="self-center text-center text-[11px] tabular-nums text-fg">{r.highCount}</span>
                <span
                  className={cn(
                    "self-center text-center text-[11px] tabular-nums",
                    r.overdueCount > 0 ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {r.overdueCount}
                </span>
                <span className="self-center text-[12px] font-semibold tabular-nums text-fg">{r.loadIndex}%</span>
                <PulseUtilBar
                  hours={r.loadIndex}
                  budget={100}
                  className="hidden max-w-[120px] self-center sm:block"
                />
                <div className="flex items-center justify-end self-center text-fg-quiet">
                  <PulseIconChevronRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center font-sans text-[13px] text-fg-muted">Ingen matcher dét filter.</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-[10px] text-fg-soft">
          {filtered.length} af {teamRows.length}
        </span>
        <Link href={routes.workload} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Disciplin-matrix i Workload →
        </Link>
      </div>
    </section>
  );
}
