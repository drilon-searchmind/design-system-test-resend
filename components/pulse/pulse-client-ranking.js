import Link from "next/link";
import { useMemo } from "react";

import { IndeksValue, NpsValue } from "@/components/clients/client-metric-cells";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { buildCustomerEntities, customerHref } from "@/lib/crm/client-groups";
import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { clientHealthBreakdown } from "@/lib/crm/client-metrics";
import { formatHoursBudgetPairDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * Top 10 sunde / usunde kunder ud fra Indeks, NPS og tidsforbrug ift. retainer.
 *
 * @param {{ kind: 'healthy' | 'unhealthy' }} props
 */
export function PulseClientRanking({ kind }) {
  const { clients, agencySettings } = usePulseData();
  const settings = agencySettings ?? DEFAULT_AGENCY_SETTINGS;
  const topN = settings.topClientsCount;
  const healthy = kind === "healthy";

  const rows = useMemo(() => {
    const scored = buildCustomerEntities(clients)
      .filter((c) => c.status === "active")
      .map((c) => ({ client: c, ...clientHealthBreakdown(c, settings) }))
      .sort((a, b) => b.score - a.score || a.client.name.localeCompare(b.client.name, "da"));
    const picked = healthy ? scored.slice(0, topN) : scored.slice(-topN).reverse();
    return picked;
  }, [clients, healthy, settings, topN]);

  return (
    <section
      className="tally-panel p-4 md:p-5"
      aria-labelledby={`pulse-top-${kind}-heading`}
    >
      <div id={`pulse-top-${kind}-heading`}>
        <PulseCardHeader
          title={healthy ? `Top ${topN} sunde kunder` : `Top ${topN} usunde kunder`}
          sub="Hold musen over scoren for udregningen."
        />
      </div>

      {rows.length === 0 ?
        <p className="mt-4 text-[12.5px] text-fg-muted">Ingen aktive kunder endnu.</p>
      : <div className="mt-3 overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-[22px_minmax(0,1fr)_44px_52px_84px_40px] items-center gap-2 border-b border-border-muted pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
              <span />
              <span>Kunde</span>
              <span>NPS</span>
              <span>Indeks</span>
              <span>Tid brugt</span>
              <span className="text-right">Score</span>
            </div>
            {rows.map(({ client: c, total: score, parts }, i) => (
              <Link
                key={c.id}
                href={customerHref(c)}
                className="grid grid-cols-[22px_minmax(0,1fr)_44px_52px_84px_40px] items-center gap-2 border-b border-border-muted py-2 text-[12.5px] last:border-0 hover:bg-surface-muted"
              >
                <span className="text-[11px] tabular-nums text-fg-quiet">{i + 1}</span>
                <span className="truncate font-medium text-fg">{c.name}</span>
                <NpsValue value={c.latestNps} />
                <IndeksValue
                  value={c.indeks}
                  status={c.indeksStatus}
                  computedAt={c.indeksComputedAt}
                  partial={c.indeksPartial}
                />
                <span
                  className={cn(
                    "tabular-nums",
                    c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {formatHoursBudgetPairDa(c.hoursThisMonth, c.hoursBudget)}
                </span>
                <CrmHoverPopover
                  align="start"
                  title={`Sundhedsscore · ${c.name}`}
                  content={
                    <div className="space-y-1.5 text-[12px] leading-snug text-fg-muted">
                      {parts.map((p) => (
                        <p key={p.label} className="flex justify-between gap-3">
                          <span>
                            {p.label} <span className="text-fg-quiet">({p.weightPct} %)</span>
                          </span>
                          <span className="font-semibold tabular-nums text-fg">{p.score}</span>
                        </p>
                      ))}
                      <p className="border-t border-border-muted pt-1.5">
                        Score = vægtet gennemsnit af Indeks, NPS og tid brugt ift. MRR retainer ={" "}
                        <span className="font-semibold text-fg">{score}</span>
                      </p>
                    </div>
                  }
                  className="justify-end"
                >
                <span
                  className={cn(
                    "text-right font-semibold tabular-nums underline decoration-dotted decoration-border underline-offset-2",
                    score >= settings.healthyThreshold && "text-agency-ok",
                    score >= settings.warnThreshold && score < settings.healthyThreshold && "text-agency-warn",
                    score < settings.warnThreshold && "text-agency-bad",
                  )}
                >
                  {score}
                </span>
                </CrmHoverPopover>
              </Link>
            ))}
          </div>
        </div>
      }
    </section>
  );
}
