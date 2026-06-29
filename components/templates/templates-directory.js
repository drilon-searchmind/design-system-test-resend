"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TemplateGridCard } from "@/components/templates/template-grid-card";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const SCOPE_DA = {
  retainer: "Retainer",
  project: "Projekt",
  any: "Alle typer",
};

const GRID =
  "grid-cols-[minmax(220px,2.2fr)_minmax(124px,0.92fr)_minmax(94px,0.85fr)_minmax(40px,0.38fr)_minmax(74px,0.72fr)_minmax(80px,0.74fr)_minmax(92px,0.85fr)_minmax(104px,0.92fr)_36px]";

/**
 * @typedef {{ id: string; name: string; hint: string; dept: string; defaultPriority: string; defaultDueOffsetDays: number; estHours: number; checklistCount: number; scope: string; active: boolean; updatedAt: string; usedCount: number }} TemplateWireLike
 */

/**
 * @typedef {{ id: string; name?: string; short?: string; color?: string }} DeptLike
 */

/**
 * @param {{
 *   templates: TemplateWireLike[];
 *   departments: DeptLike[];
 *   totalTemplates?: number;
 *   headingId?: string;
 *   toolbarTitle?: string;
 * }} props
 */
export function TemplatesDirectory({
  templates,
  departments,
  totalTemplates,
  headingId = "templates-directory-heading",
  toolbarTitle = "Alle skabeloner",
}) {
  const total = typeof totalTemplates === "number" ? totalTemplates : templates.length;

  const [q, setQ] = useState("");
  const [lifecycle, setLifecycle] = useState("all");
  const [sort, setSort] = useState("updated");
  const [density, setDensity] = useState("list");

  const activeCount = useMemo(() => templates.filter((t) => t.active).length, [templates]);

  const filtered = useMemo(() => {
    const list = templates.filter((t) => {
      const ql = q.trim().toLowerCase();
      if (
        ql &&
        !t.name.toLowerCase().includes(ql) &&
        !t.hint.toLowerCase().includes(ql) &&
        !t.id.toLowerCase().includes(ql)
      ) {
        return false;
      }
      if (lifecycle === "active" && !t.active) return false;
      if (lifecycle === "archived" && t.active) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      if (sort === "name") return a.name.localeCompare(b.name, "da");
      if (sort === "used") return b.usedCount - a.usedCount;
      return 0;
    });

    return list;
  }, [q, lifecycle, sort, templates]);

  return (
    <section
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
          {toolbarTitle}
        </h2>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {total}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg navn, hint eller id…"
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
            active={lifecycle}
            onChange={setLifecycle}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "active", label: "Aktive", count: activeCount },
              { id: "archived", label: "Arkiverede", count: total - activeCount },
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
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:p-4">
          {filtered.map((row) => (
            <TemplateGridCard key={row.id} row={row} departments={departments} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("name")}
              >
                Skabelon {sort === "name" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Disciplin</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("used")}
              >
                Anvendelser {sort === "used" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Status</span>
              <span>Prio</span>
              <span>Deadline (+d)</span>
              <span>Est.</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("updated")}
              >
                Sidst red. {sort === "updated" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span aria-hidden />
            </div>

            {filtered.map((row, i) => {
              const dep = departments.find((d) => d.id === row.dept);
              const href = `/templates/${encodeURIComponent(row.id)}`;
              return (
                <Link
                  key={row.id}
                  href={href}
                  className={cn(
                    "grid w-full cursor-pointer gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    GRID,
                    i < filtered.length - 1 && "border-b border-border-soft",
                    !row.active && "opacity-[0.72]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-sans text-[13px] font-medium leading-snug text-fg">{row.name}</div>
                    <div className="mt-0.5 line-clamp-1 font-sans text-[11px] text-fg-quiet">{row.hint}</div>
                  </div>
                  <div className="flex min-w-0 items-center">
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{
                        color: typeof dep?.color === "string" && dep.color ? dep.color : undefined,
                      }}
                    >
                      {(dep?.short ?? dep?.name ?? "").trim().slice(0, 8) || row.dept}
                    </span>
                  </div>
                  <span className="text-[12px] tabular-nums text-fg">{row.usedCount}×</span>
                  <div className="hidden items-center justify-center sm:flex">
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        row.active ? "border-agency-brand-border text-agency-brand" : "border-border text-fg-quiet",
                      )}
                    >
                      {row.active ? "Ja" : "Nej"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <TaskPriorityChip
                      priority={row.defaultPriority === "high" || row.defaultPriority === "low" ? row.defaultPriority : "medium"}
                      className="scale-95 origin-left"
                    />
                  </div>
                  <span className="text-[12px] tabular-nums text-fg">{row.defaultDueOffsetDays} d</span>
                  <span className="text-[12px] tabular-nums text-fg">{row.estHours} t</span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[12px] tabular-nums text-fg">
                      {formatIsoDateDa(row.updatedAt)}
                    </span>
                    <span className="text-[10px] text-fg-quiet">{SCOPE_DA[row.scope] ?? row.scope}</span>
                  </div>
                  <PulseIconChevronRight className="justify-self-end text-fg-quiet" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
