"use client";

import { UpsellDetails } from "@/components/clients/retainer-with-upsell";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { UPSELL_TYPES, monthKey } from "@/lib/crm/upsell-utils";
import { cn } from "@/lib/utils";

/** Rækkefølge og farver for søjle-segmenter (fast MRR er mest værd → mørkest). */
const TYPE_SEGMENTS = /** @type {const} */ ([
  { type: "mrr_increase", className: "bg-agency-brand" },
  { type: "temporary_mrr", className: "bg-agency-brand/60" },
  { type: "one_time", className: "bg-agency-brand/30" },
]);

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Opsalg pr. sælger for den valgte periode (efter salgsdato). Fast MRR-stigninger tæller med,
 * da de også er salg. Søjlens længde er relativ til den bedste sælger; farverne viser typen.
 */
export function PulseUpsellLeaderboard() {
  const { clients, team, period } = usePulseData();
  const ym = monthKey(period.year, period.month);

  /** @type {Map<string, { key: string; name: string; total: number; byType: Record<string, number>; items: import("@/lib/crm/upsell-utils").UpsellItem[] }>} */
  const bySeller = new Map();
  for (const c of clients) {
    for (const u of c.upsells ?? []) {
      if (!u.soldAt || u.soldAt.slice(0, 7) !== ym) continue;
      const key = u.soldByKey || u.soldBy;
      const row = bySeller.get(key) ?? { key, name: u.soldBy, total: 0, byType: {}, items: [] };
      row.total += u.amount;
      row.byType[u.type] = (row.byType[u.type] ?? 0) + u.amount;
      row.items.push({ ...u, clientName: u.clientName ?? c.name });
      bySeller.set(key, row);
    }
  }
  const rows = [...bySeller.values()].sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((r) => r.total), 1);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const upsellCount = rows.reduce((s, r) => s + r.items.length, 0);

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-upsell-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div id="pulse-upsell-heading">
          <PulseCardHeader
            title="Opsalg pr. sælger"
            sub={`Solgt i ${period.label.toLowerCase()}, rangeret efter samlet beløb. Hold musen over en sælger for detaljerne.`}
          />
        </div>
        {rows.length > 0 ?
          <div className="text-right">
            <div className="font-sans text-xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
              {formatCurrencyCompact(grandTotal)}
            </div>
            <div className="text-[11px] text-fg-quiet">
              {upsellCount} opsalg · {rows.length} sælgere
            </div>
          </div>
        : null}
      </div>

      {rows.length === 0 ?
        <p className="mt-4 text-[13px] text-fg-muted">Ingen opsalg solgt i denne periode.</p>
      : <ol className="mt-4 space-y-1.5">
          {rows.map((r, i) => {
            const member = team.find((m) => m.id === r.key) ?? team.find((m) => m.name === r.name);
            const share = grandTotal > 0 ? r.total / grandTotal : 0;
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
                  content={<UpsellDetails items={r.items} showClient />}
                  className="w-full"
                  triggerClassName="w-full"
                >
                  <div className="flex w-full min-w-0 items-center gap-3">
                    <CrmAvatar
                      label={member?.avatar ?? r.name}
                      src={member?.image}
                      hue={member?.hue ?? 220}
                      className="size-9 rounded-full text-[11px]"
                      alt={r.name}
                    />
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
                  </div>
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
          <span className="text-fg-quiet">Søjlen er relativ til den bedste sælger. Farve = type:</span>
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