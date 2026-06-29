"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ContractGridCard } from "@/components/contracts/contract-grid-card";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { routes } from "@/config/routes";
import { CONTRACT_DEMO_REF_DATE, contractDaysUntilRenewal, contractNeedsRenewalSoon } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact, formatIsoDateDa } from "@/lib/crm/format-da";
import { CONTRACTS, TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(168px,1.95fr)_minmax(64px,0.9fr)_minmax(72px,0.82fr)_minmax(76px,1fr)_minmax(72px,0.82fr)_minmax(96px,1.05fr)_minmax(28px,0.32fr)_36px]";

/**
 * @param {{
 *   contracts?: Array<{
 *     id: string;
 *     clientName: string;
 *     kind: string;
 *     monthlyValue: number;
 *     currency: string;
 *     startedAt: string;
 *     renewalAt: string;
 *     accountStatus: string;
 *     health: string;
 *     ownerId: string;
 *     clientLogo: string;
 *     clientHue: number;
 *     noticeDays: number;
 *   }>;
 *   team?: Array<{ id: string; avatar: string; hue: number; name: string }>;
 *   renewalReferenceIso?: string;
 *   headingId?: string;
 *   toolbarTitle?: string;
 * }} props
 */
export function ContractsDirectory({
  contracts,
  team,
  renewalReferenceIso = CONTRACT_DEMO_REF_DATE,
  headingId = "contracts-directory-heading",
  toolbarTitle = "Alle kontrakter",
}) {
  const roster = contracts ?? CONTRACTS;
  const memberRoster = team ?? TEAM;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [density, setDensity] = useState("list");

  const renewalCount = useMemo(
    () => roster.filter((c) => contractNeedsRenewalSoon(c, 90, renewalReferenceIso)).length,
    [renewalReferenceIso, roster],
  );

  const filtered = useMemo(() => {
    const list = roster.filter((c) => {
      const ql = q.trim().toLowerCase();
      if (
        ql &&
        !c.clientName.toLowerCase().includes(ql) &&
        !c.kind.toLowerCase().includes(ql)
      ) {
        return false;
      }
      if (filter === "active" && c.accountStatus !== "active") return false;
      if (filter === "renewal" && !contractNeedsRenewalSoon(c, 90, renewalReferenceIso)) return false;
      if (filter === "paused" && c.accountStatus !== "paused") return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "name") return a.clientName.localeCompare(b.clientName, "da");
      if (sort === "value") return b.monthlyValue - a.monthlyValue;
      if (sort === "renewal") return a.renewalAt.localeCompare(b.renewalAt);
      return 0;
    });

    return list;
  }, [q, filter, sort, renewalReferenceIso, roster]);

  return (
    <section
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h3 id={headingId} className="font-sans text-sm font-semibold text-fg">
          {toolbarTitle}
        </h3>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {roster.length}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[260px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg kontrakt eller kunde…"
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
              {
                id: "active",
                label: "Aktive",
                count: roster.filter((c) => c.accountStatus === "active").length,
              },
              { id: "renewal", label: "Fornyelse", count: renewalCount },
              {
                id: "paused",
                label: "Pause",
                count: roster.filter((c) => c.accountStatus === "paused").length,
              },
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
            <ContractGridCard key={row.id} row={row} renewalReferenceIso={renewalReferenceIso} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button
                type="button"
                className="flex items-center gap-1 text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("name")}
              >
                Kontrakt / kunde{" "}
                {sort === "name" ? <PulseIconChevronDown className="opacity-70" /> : null}
              </button>
              <span>Ejer</span>
              <span>Status</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("value")}
              >
                Beløb/md
              </button>
              <span>Start</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("renewal")}
              >
                Fornyelse
              </button>
              <span className="hidden sm:inline">Sundhed</span>
              <span />
            </div>

            {filtered.map((row, i) => {
              const owner = memberRoster.find((t) => t.id === row.ownerId);
              const days = contractDaysUntilRenewal(row.renewalAt, renewalReferenceIso);

              return (
                <Link
                  key={row.id}
                  href={`${routes.contracts}/${row.id}`}
                  className={cn(
                    "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    GRID,
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-border text-[10.5px] font-semibold text-white"
                      style={{ background: `oklch(62% 0.14 ${row.clientHue})` }}
                    >
                      {row.clientLogo}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-sans text-[13px] font-medium text-fg">
                        {row.clientName}
                      </div>
                      <div className="truncate text-[11px] text-fg-quiet">{row.kind}</div>
                    </div>
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

                  <div className="flex items-center">
                    <StatusChip status={row.accountStatus} palette="agency" className="scale-95 origin-left" />
                  </div>

                  <span className="text-[12.5px] tabular-nums text-fg">
                    {formatCurrencyCompact(row.monthlyValue, row.currency)}
                  </span>

                  <span className="text-[11.5px] tabular-nums text-fg-muted">
                    {formatIsoDateDa(row.startedAt)}
                  </span>

                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[12px] tabular-nums text-fg">
                      {formatIsoDateDa(row.renewalAt)}
                    </span>
                    {row.accountStatus === "active" ? (
                      <span
                        className={cn(
                          "text-[10px] tabular-nums",
                          days < 0 && "text-agency-bad",
                          days >= 0 && days <= 30 && "text-agency-warn",
                          days > 30 && "text-fg-quiet",
                        )}
                      >
                        {days < 0
                          ? `${Math.abs(days)} d overskredet`
                          : days === 0
                            ? "I dag"
                            : `Om ${days} d`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-fg-quiet">—</span>
                    )}
                  </div>

                  <div className="hidden items-center justify-end sm:flex">
                    <HealthChip health={row.health} palette="agency" compact />
                  </div>

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
