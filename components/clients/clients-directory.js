"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ClientGridCard } from "@/components/clients/client-grid-card";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { PulseAllocationBar } from "@/components/pulse/pulse-allocation-bar";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { usePulseDataOptional } from "@/components/pulse/pulse-data-context";
import { CLIENTS as STATIC_CLIENTS, TEAM as STATIC_TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID_PULSE =
  "grid-cols-[minmax(200px,2.2fr)_minmax(88px,1.1fr)_minmax(72px,1fr)_minmax(120px,1.45fr)_minmax(52px,0.65fr)_minmax(96px,1fr)_40px]";
const GRID_FULL =
  "grid-cols-[minmax(160px,1.85fr)_minmax(68px,0.95fr)_minmax(76px,0.85fr)_minmax(64px,0.95fr)_minmax(108px,1.25fr)_minmax(44px,0.55fr)_minmax(84px,0.95fr)_minmax(72px,0.85fr)_36px]";

/**
 * @param {{
 *   variant?: 'pulse' | 'full';
 *   headingId?: string;
 *   toolbarTitle?: string;
 *   clients?: import('@/lib/crm/pulse-types').PulseClient[];
 *   team?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   hoursColumnLabel?: string;
 * }} props
 */
export function ClientsDirectory({
  variant = "pulse",
  headingId,
  toolbarTitle = "Alle kunder",
  clients: clientsProp,
  team: teamProp,
  hoursColumnLabel,
}) {
  const pulseCtx = usePulseDataOptional();
  const CLIENTS = clientsProp ?? pulseCtx?.clients ?? STATIC_CLIENTS;
  const TEAM = teamProp ?? pulseCtx?.team ?? STATIC_TEAM;
  const resolvedHeadingId =
    headingId ?? (variant === "pulse" ? "pulse-clients-heading" : "clients-directory-heading");

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [density, setDensity] = useState("list");

  const unhealthyCount = useMemo(() => CLIENTS.filter((c) => c.health !== "ok").length, [CLIENTS]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = CLIENTS.filter((c) => {
      const industry = (c.industry ?? "").toLowerCase();
      if (ql && !c.name.toLowerCase().includes(ql) && !industry.includes(ql)) {
        return false;
      }
      if (filter === "unhealthy" && c.health === "ok") return false;
      if (filter === "over" && c.hoursThisMonth <= c.hoursBudget) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "da");
      if (sort === "retainer") return b.retainer - a.retainer;
      if (sort === "util") {
        const au = a.hoursBudget > 0 ? a.hoursThisMonth / a.hoursBudget : 0;
        const bu = b.hoursBudget > 0 ? b.hoursThisMonth / b.hoursBudget : 0;
        return bu - au;
      }
      return 0;
    });

    return list;
  }, [q, filter, sort, CLIENTS]);

  const gridCols = variant === "full" ? GRID_FULL : GRID_PULSE;
  const hoursLabel = hoursColumnLabel ?? "Timer denne md";
  const minW = variant === "full" ? "min-w-[1040px]" : "min-w-[920px]";

  return (
    <section className="tally-panel overflow-hidden" aria-labelledby={resolvedHeadingId}>
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h3 id={resolvedHeadingId} className="text-sm font-semibold tracking-[-0.02em] text-fg">
          {toolbarTitle}
        </h3>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {CLIENTS.length}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[240px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg kunde…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-full border border-border bg-surface-muted py-1 pl-9 pr-3",
                "text-[13px] text-fg placeholder:text-fg-quiet",
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
              { id: "unhealthy", label: "Usunde", count: unhealthyCount },
              { id: "over", label: "Over budget" },
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
          {filtered.map((c) => (
            <ClientGridCard key={c.id} client={c} variant={variant} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={minW}>
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                gridCols,
              )}
            >
              <button
                type="button"
                className="flex items-center gap-1 text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("name")}
              >
                Kunde {sort === "name" ? <PulseIconChevronDown className="opacity-70" /> : null}
              </button>
              <span>Ejer</span>
              {variant === "full" ? <span>Status</span> : null}
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("retainer")}
              >
                Retainer
              </button>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("util")}
              >
                {hoursLabel}
              </button>
              <span>Margin</span>
              <span>Allokering</span>
              {variant === "full" ? (
                <span className="hidden sm:inline">Sidst aktiv</span>
              ) : null}
              <span />
            </div>

            {filtered.map((c, i) => {
              const owner = TEAM.find((t) => t.id === c.owner);
              const util = c.hoursBudget > 0 ? c.hoursThisMonth / c.hoursBudget : 0;

              return (
                <Link
                  key={c.id}
                  href={`${routes.clients}/${c.id}`}
                  className={cn(
                    "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    gridCols,
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-border text-[10.5px] font-semibold text-white"
                      style={{ background: `oklch(62% 0.14 ${c.hue})` }}
                    >
                      {c.logo}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-sans text-[13px] font-medium text-fg">{c.name}</div>
                      <div className="truncate font-sans text-[11px] text-fg-quiet">{c.industry}</div>
                    </div>
                    <HealthChip health={c.health} palette="agency" compact />
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    {owner ? (
                      <>
                        <CrmAvatar label={owner.avatar} hue={owner.hue} className="size-5 text-[9px]" />
                        <span className="truncate font-sans text-[12px] text-fg-muted">{owner.name}</span>
                      </>
                    ) : (
                      <span className="text-fg-quiet">—</span>
                    )}
                  </div>

                  {variant === "full" ? (
                    <div className="flex items-center">
                      <StatusChip status={c.status} palette="agency" className="scale-95 origin-left" />
                    </div>
                  ) : null}

                  <span className="text-[12.5px] tabular-nums text-fg">
                    {formatCurrencyCompact(c.retainer, c.currency)}
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[12px] tabular-nums",
                        util > 1 ? "text-agency-bad" : "text-fg",
                      )}
                    >
                      {c.hoursThisMonth}/{c.hoursBudget}t
                    </span>
                    <PulseUtilBar hours={c.hoursThisMonth} budget={c.hoursBudget} className="max-w-[120px] flex-1" />
                  </div>

                  <span
                    className={cn(
                      "text-[12.5px] tabular-nums",
                      c.monthlyProfitMargin < 0 && "text-agency-bad",
                      c.monthlyProfitMargin >= 0 &&
                        c.monthlyProfitMargin < 0.15 &&
                        "text-agency-warn",
                      c.monthlyProfitMargin >= 0.15 && "text-agency-ok",
                    )}
                  >
                    {formatPercent(c.monthlyProfitMargin)}
                  </span>

                  <PulseAllocationBar allocation={c.allocation} height={6} />

                  {variant === "full" ? (
                    <span className="hidden truncate text-[11px] tabular-nums text-fg-muted sm:inline">
                      {c.lastActivity}
                    </span>
                  ) : null}

                  <PulseIconChevronRight className="justify-self-end text-fg-quiet" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
