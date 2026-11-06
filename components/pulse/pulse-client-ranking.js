import Link from "next/link";
import { useMemo } from "react";

import { IndeksValue, NpsValue } from "@/components/clients/client-metric-cells";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { buildCustomerEntities, customerHref } from "@/lib/crm/client-groups";
import { clientHealthScore } from "@/lib/crm/client-metrics";
import { formatHoursBudgetPairDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const TOP_N = 10;

/**
 * Top 10 sunde / usunde kunder ud fra Indeks, NPS og tidsforbrug ift. retainer.
 *
 * @param {{ kind: 'healthy' | 'unhealthy' }} props
 */
export function PulseClientRanking({ kind }) {
  const { clients } = usePulseData();
  const healthy = kind === "healthy";

  const rows = useMemo(() => {
    const scored = buildCustomerEntities(clients)
      .filter((c) => c.status === "active")
      .map((c) => ({ client: c, score: clientHealthScore(c) }))
      .sort((a, b) => b.score - a.score || a.client.name.localeCompare(b.client.name, "da"));
    const picked = healthy ? scored.slice(0, TOP_N) : scored.slice(-TOP_N).reverse();
    return picked;
  }, [clients, healthy]);

  return (
    <section
      className="tally-panel p-4 md:p-5"
      aria-labelledby={`pulse-top-${kind}-heading`}
    >
      <div id={`pulse-top-${kind}-heading`}>
        <PulseCardHeader
          title={healthy ? "Top 10 sunde kunder" : "Top 10 usunde kunder"}
          sub="Score ud fra Indeks, NPS og tid brugt i forhold til MRR retainer"
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
            {rows.map(({ client: c, score }, i) => (
              <Link
                key={c.id}
                href={customerHref(c)}
                className="grid grid-cols-[22px_minmax(0,1fr)_44px_52px_84px_40px] items-center gap-2 border-b border-border-muted py-2 text-[12.5px] last:border-0 hover:bg-surface-muted"
              >
                <span className="text-[11px] tabular-nums text-fg-quiet">{i + 1}</span>
                <span className="truncate font-medium text-fg">{c.name}</span>
                <NpsValue value={c.latestNps} />
                <IndeksValue value={c.indeks} />
                <span
                  className={cn(
                    "tabular-nums",
                    c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {formatHoursBudgetPairDa(c.hoursThisMonth, c.hoursBudget)}
                </span>
                <span
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    score >= 70 && "text-agency-ok",
                    score >= 50 && score < 70 && "text-agency-warn",
                    score < 50 && "text-agency-bad",
                  )}
                >
                  {score}
                </span>
              </Link>
            ))}
          </div>
        </div>
      }
    </section>
  );
}
