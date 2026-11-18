"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { buildCustomerEntities, customerHref } from "@/lib/crm/client-groups";
import { formatCurrency, formatCurrencyCompact, formatIsoDateDa, formatPercent } from "@/lib/crm/format-da";
import { UPSELL_TYPES, formatUpsellPeriodDa, monthKey } from "@/lib/crm/upsell-utils";
import { cn } from "@/lib/utils";

/** Rækkefølge og farver for søjle-segmenter (fast MRR er mest værd → mørkest). */
const TYPE_SEGMENTS = /** @type {const} */ ([
  { type: "mrr_increase", className: "bg-agency-brand" },
  { type: "temporary_mrr", className: "bg-agency-brand/60" },
  { type: "one_time", className: "bg-agency-brand/30" },
]);

const MEDALS = ["🥇", "🥈", "🥉"];

const VIEW_TABS = [
  { id: "clients", label: "Kunder" },
  { id: "sellers", label: "Sælgere" },
];

/**
 * @typedef {import("@/lib/crm/upsell-utils").UpsellItem} UpsellItem
 * @typedef {{ key: string; name: string; href?: string; total: number; byType: Record<string, number>; items: UpsellItem[] }} UpsellRow
 */

/**
 * Opsalgsliste til hover. Sælger vises kun når `showSeller` (admins).
 * @param {{ items: UpsellItem[]; showClient?: boolean; showSeller?: boolean }} props
 */
function UpsellItemList({ items, showClient = false, showSeller = false }) {
  return (
    <ul className="max-w-xs space-y-2.5 text-[12px] leading-snug text-fg-muted">
      {items.map((u) => (
        <li key={u.id} className="border-b border-border-muted pb-2 last:border-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-fg">{UPSELL_TYPES[u.type]?.label ?? u.type}</span>
            <span className="tabular-nums font-semibold text-fg">
              {formatCurrency(u.amount, u.currency || "DKK")}
              {u.type === "temporary_mrr" ? " / md" : ""}
            </span>
          </div>
          <div className="mt-0.5 text-fg-quiet">
            {showClient && u.clientName ? `${u.clientName} · ` : ""}
            {formatUpsellPeriodDa(u)}
            {showSeller && u.soldBy ? ` · solgt af ${u.soldBy}` : ""}
            {u.soldAt ? ` · ${formatIsoDateDa(u.soldAt)}` : ""}
          </div>
          {u.description ? <p className="mt-1">{u.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {Map<string, UpsellRow>} map
 * @param {string} key
 * @param {Omit<UpsellRow, "total" | "byType" | "items">} init
 * @param {UpsellItem} u
 */
function addToRow(map, key, init, u) {
  const row = map.get(key) ?? { ...init, total: 0, byType: {}, items: [] };
  row.total += u.amount;
  row.byType[u.type] = (row.byType[u.type] ?? 0) + u.amount;
  row.items.push(u);
  map.set(key, row);
}

/** @param {UpsellRow[]} rows */
function sortRows(rows) {
  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "da"));
}

/**
 * Top kunde opsalg for den valgte periode (efter salgsdato). Fast MRR-stigninger tæller med,
 * da de også er salg. Admins kan skifte til visningen pr. sælger; andre ser aldrig sælgernavne.
 */
export function PulseUpsellLeaderboard() {
  const { clients, team, period } = usePulseData();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const [view, setView] = useState(/** @type {"clients" | "sellers"} */ ("clients"));
  const showSellers = isAdmin && view === "sellers";
  const ym = monthKey(period.year, period.month);

  const { byClient, bySeller } = useMemo(() => {
    /** @type {Map<string, UpsellRow>} */
    const clientMap = new Map();
    /** @type {Map<string, UpsellRow>} */
    const sellerMap = new Map();
    for (const c of buildCustomerEntities(clients)) {
      for (const raw of c.upsells ?? []) {
        if (!raw.soldAt || raw.soldAt.slice(0, 7) !== ym) continue;
        const u = { ...raw, clientName: raw.clientName ?? c.name };
        addToRow(clientMap, c.id, { key: c.id, name: c.name, href: customerHref(c) }, u);
        const sellerKey = u.soldByKey || u.soldBy;
        addToRow(sellerMap, sellerKey, { key: sellerKey, name: u.soldBy }, u);
      }
    }
    return { byClient: sortRows([...clientMap.values()]), bySeller: sortRows([...sellerMap.values()]) };
  }, [clients, ym]);

  const rows = showSellers ? bySeller : byClient;
  const max = Math.max(...rows.map((r) => r.total), 1);
  const grandTotal = byClient.reduce((s, r) => s + r.total, 0);
  const upsellCount = byClient.reduce((s, r) => s + r.items.length, 0);

  return (
    <section className="tally-panel flex flex-col p-4 md:p-5" aria-labelledby="pulse-upsell-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div id="pulse-upsell-heading">
          <PulseCardHeader
            title={showSellers ? "Opsalg pr. sælger" : "Top kunde opsalg"}
            sub={`Solgt i ${period.label.toLowerCase()}, rangeret efter samlet beløb. Hold musen over en ${
              showSellers ? "sælger" : "kunde"
            } for detaljerne.`}
          />
        </div>
        {byClient.length > 0 ?
          <div className="text-right">
            <div className="font-sans text-xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
              {formatCurrencyCompact(grandTotal)}
            </div>
            <div className="text-[11px] text-fg-quiet">
              {upsellCount} opsalg · {showSellers ? `${bySeller.length} sælgere` : `${byClient.length} kunder`}
            </div>
          </div>
        : null}
      </div>

      {isAdmin ?
        <PulseSegmentedControl
          tabs={VIEW_TABS}
          active={view}
          onChange={(id) => setView(id === "sellers" ? "sellers" : "clients")}
          size="sm"
          className="mt-3 self-start"
        />
      : null}

      {rows.length === 0 ?
        <p className="mt-4 text-[13px] text-fg-muted">Ingen opsalg solgt i denne periode.</p>
      : <ol className="mt-4 space-y-1.5">
          {rows.map((r, i) => {
            const member =
              showSellers ? (team.find((m) => m.id === r.key) ?? team.find((m) => m.name === r.name)) : null;
            const share = grandTotal > 0 ? r.total / grandTotal : 0;
            const label = (
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-semibold text-fg">{r.name}</span>
                  <span className="shrink-0 text-[11px] text-fg-quiet">
                    {r.items.length} opsalg · {formatPercent(share)} af samlet
                  </span>
                </div>
                <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-surface-muted-strong ring-1 ring-border/40">
                  <div className="flex h-full" style={{ width: `${(r.total / max) * 100}%` }}>
                    {TYPE_SEGMENTS.map((s) =>
                      r.byType[s.type] ?
                        <div
                          key={s.type}
                          className={cn("h-full", s.className)}
                          style={{ width: `${(r.byType[s.type] / r.total) * 100}%` }}
                        />
                      : null,
                    )}
                  </div>
                </div>
              </div>
            );
            return (
              <li
                key={r.key}
                className={cn(
                  "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5",
                  i === 0 ? "bg-agency-brand-soft ring-1 ring-agency-brand-border" : "bg-surface-muted/50",
                )}
              >
                <span className="text-center text-[15px] leading-none" aria-label={`Nr. ${i + 1}`}>
                  {MEDALS[i] ?? <span className="text-[12px] font-semibold text-fg-quiet">{i + 1}</span>}
                </span>

                <CrmHoverPopover
                  align="start"
                  title={`${r.name} — ${r.items.length} opsalg`}
                  content={<UpsellItemList items={r.items} showClient={showSellers} showSeller={isAdmin} />}
                  className="w-full"
                  triggerClassName="w-full"
                >
                  {showSellers ?
                    <div className="flex w-full min-w-0 items-center gap-3">
                      <CrmAvatar
                        label={member?.avatar ?? r.name}
                        src={member?.image}
                        hue={member?.hue ?? 220}
                        className="size-9 rounded-full text-[11px]"
                        alt={r.name}
                      />
                      {label}
                    </div>
                  : <Link href={r.href ?? "#"} className="flex w-full min-w-0 items-center gap-3">
                      {label}
                    </Link>
                  }
                </CrmHoverPopover>

                <span className="text-right font-sans text-[15px] font-semibold tabular-nums text-fg">
                  {formatCurrencyCompact(r.total)}
                </span>
              </li>
            );
          })}
        </ol>
      }

      {rows.length > 0 ?
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-muted pt-3 text-[11px] text-fg-muted">
          <span className="text-fg-quiet">
            Søjlen er relativ til {showSellers ? "den bedste sælger" : "kunden med mest opsalg"}. Farve = type:
          </span>
          {TYPE_SEGMENTS.map((s) => (
            <span key={s.type} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-3 rounded-sm", s.className)} />
              {UPSELL_TYPES[s.type].label}
            </span>
          ))}
        </div>
      : null}
    </section>
  );
}
