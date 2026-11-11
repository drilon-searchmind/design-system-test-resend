"use client";

import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { formatCurrencyCompact, formatHoursCompactDa, formatPercent } from "@/lib/crm/format-da";
import { buildMarginBands } from "@/lib/crm/pulse-kpi-utils";
import { cn } from "@/lib/utils";

/** @param {{ items: { name: string; amount: number }[]; empty: string }} props */
function NameList({ items, empty }) {
  if (!items.length) return <p className="text-[12px] text-fg-muted">{empty}</p>;
  return (
    <ul className="space-y-1 text-[12px] text-fg-muted">
      {items.map((x, i) => (
        <li key={`${x.name}-${i}`} className="flex justify-between gap-3">
          <span className="truncate text-fg">{x.name}</span>
          <span className="tabular-nums">{formatCurrencyCompact(x.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * MRR-bro: hvad flyttede MRR siden forrige måned? (nye kunder, fast opsalg, churn)
 * @param {{ bridge: import("@/lib/crm/pulse-kpi-utils").MrrBridge }} props
 */
export function MrrBridgeVisual({ bridge }) {
  const pills = [
    { id: "new", label: "Nye", sign: "+", amount: bridge.newMrr, count: bridge.newClients.length, tone: "ok", items: bridge.newClients, empty: "Ingen nye kunder i perioden." },
    { id: "inc", label: "Opsalg", sign: "+", amount: bridge.increases, count: bridge.increaseItems.length, tone: "ok", items: bridge.increaseItems, empty: "Ingen faste MRR-stigninger i perioden." },
    { id: "churn", label: "Churn", sign: "−", amount: bridge.churn, count: bridge.churned.length, tone: "bad", items: bridge.churned, empty: "Ingen stoppede kunder i perioden." },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((p) => (
          <CrmHoverPopover
            key={p.id}
            align="start"
            title={`${p.label} i perioden`}
            content={<NameList items={p.items} empty={p.empty} />}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums",
                p.amount === 0 && "border-border text-fg-quiet",
                p.amount > 0 && p.tone === "ok" && "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
                p.amount > 0 && p.tone === "bad" && "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
              )}
            >
              {p.label} {p.amount > 0 ? `${p.sign}${formatCurrencyCompact(p.amount)}` : "0"}
              {p.count > 0 ? <span className="font-normal opacity-70">({p.count})</span> : null}
            </span>
          </CrmHoverPopover>
        ))}
        {bridge.adjustments !== 0 ?
          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-fg-muted">
            Justeringer {bridge.adjustments > 0 ? "+" : "−"}
            {formatCurrencyCompact(Math.abs(bridge.adjustments))}
          </span>
        : null}
      </div>
      <p className="mt-1.5 text-[10.5px] text-fg-quiet">
        Fra {formatCurrencyCompact(bridge.start)} ved periodens start
        {bridge.startSource === "derived" ? " (udledt)" : ""}
      </p>
    </div>
  );
}

/**
 * Fakturérbare timer pr. dag i perioden (rigtig dagsserie).
 * @param {{ data: { day: number; billable: number }[] }} props
 */
export function UtilDailyVisual({ data }) {
  const series = data.map((d) => d.billable);
  const total = series.reduce((s, v) => s + v, 0);
  const peak = data.reduce((best, d) => (d.billable > best.billable ? d : best), data[0] ?? { day: 0, billable: 0 });
  return (
    <div className="text-agency-ok">
      <PulseSparkline data={series} height={30} />
      <p className="mt-1.5 text-[10.5px] text-fg-quiet">
        Fakturérbare timer pr. dag · i alt {formatHoursCompactDa(total)} t
        {peak.billable > 0 ? ` · højeste ${formatHoursCompactDa(peak.billable)} t (d. ${peak.day})` : ""}
      </p>
    </div>
  );
}

/**
 * Fakturérbar tid vs overhead som én stablet søjle.
 * @param {{ billableHours: number; overheadHours: number }} props
 */
export function OverheadSplitVisual({ billableHours, overheadHours }) {
  const total = billableHours + overheadHours;
  const overheadShare = total > 0 ? overheadHours / total : 0;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted-strong ring-1 ring-border/40">
        <div className="h-full bg-agency-ok" style={{ width: `${(1 - overheadShare) * 100}%` }} />
        <div className="h-full bg-agency-warn" style={{ width: `${overheadShare * 100}%` }} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[10.5px] text-fg-quiet">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-agency-ok" /> {formatHoursCompactDa(billableHours)} t fakturérbar
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-agency-warn" /> {formatHoursCompactDa(overheadHours)} t overhead (
          {formatPercent(overheadShare)})
        </span>
      </p>
    </div>
  );
}

/**
 * Hvor mange kunder ligger i hvilket margin-bånd? Hover på en søjle viser kunderne.
 * @param {{ clients: Array<Record<string, any>> }} props
 */
export function MarginBandsVisual({ clients }) {
  const bands = buildMarginBands(clients);
  const max = Math.max(...bands.map((b) => b.count), 1);
  return (
    <div>
      <div className="flex h-[34px] items-end gap-1.5">
        {bands.map((b) => (
          <CrmHoverPopover
            key={b.id}
            align="start"
            title={`${b.label} margin — ${b.count} kunder`}
            content={
              b.items.length ?
                <ul className="space-y-1 text-[12px] text-fg-muted">
                  {b.items.map((x) => (
                    <li key={x.id} className="flex justify-between gap-3">
                      <span className="truncate text-fg">{x.name}</span>
                      <span className="tabular-nums">{formatPercent(x.margin)}</span>
                    </li>
                  ))}
                </ul>
              : <p className="text-[12px] text-fg-muted">Ingen kunder i dette bånd.</p>
            }
            className="flex-1"
            triggerClassName="w-full items-end"
          >
            <div
              className={cn("w-full rounded-t-sm", b.count ? b.tone : "bg-surface-muted-strong")}
              style={{ height: `${Math.max(Math.round((b.count / max) * 34), 4)}px` }}
            />
          </CrmHoverPopover>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] tabular-nums text-fg-quiet">
        {bands.map((b) => (
          <span key={b.id} className="flex-1 text-center">
            {b.count}
          </span>
        ))}
      </div>
      <p className="mt-0.5 text-[10.5px] text-fg-quiet">Kunder pr. margin-bånd (&lt;0 · 0–15 · 15–30 · &gt;30 %)</p>
    </div>
  );
}