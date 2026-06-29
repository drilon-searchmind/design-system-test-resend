import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   avgLatest: number | null;
 *   avgPrev: number | null;
 *   measured: number;
 *   rollupTotal: number;
 *   atRisk: number;
 *   improving: number;
 *   promoterRatio: number;
 *   passiveRatio: number;
 *   detractorRatio: number;
 *   responseRate: number;
 *   invitations: number;
 *   responses: number;
 *   medianHoursToRespond: number;
 *   pulseAlertCount: number;
 *   responseRateLabel?: string;
 *   invitationsLabel?: string;
 * }} props
 */
export function NpsSummaryStrip({
  avgLatest,
  avgPrev,
  measured,
  rollupTotal,
  atRisk,
  improving,
  promoterRatio,
  passiveRatio,
  detractorRatio,
  responseRate,
  invitations,
  responses,
  medianHoursToRespond,
  pulseAlertCount,
  responseRateLabel = "Svarfrekvens (seneste runde)",
  invitationsLabel = "Invitationer sidste runde",
}) {
  const delta = avgLatest != null && avgPrev != null ? avgLatest - avgPrev : null;
  const deltaTone =
    delta == null ? "brand" : delta > 0.5 ? "ok" : delta < -0.5 ? "bad" : delta === 0 ? "warn" : "warn";
  const latestTone =
    avgLatest == null ? "brand" : avgLatest >= 50 ? "ok" : avgLatest >= 40 ? "warn" : "bad";
  const covTone = measured >= rollupTotal * 0.9 ? "ok" : measured >= rollupTotal * 0.7 ? "warn" : "brand";
  const riskTone = atRisk > 2 ? "bad" : atRisk > 0 ? "warn" : "ok";
  const upliftTone = improving >= 4 ? "ok" : improving > 0 ? "brand" : "warn";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-3">
      <PulseKpiCard
        label="Bureau NPS (gns. seneste)"
        value={avgLatest != null ? avgLatest.toFixed(1) : "—"}
        tone={latestTone}
      />
      <PulseKpiCard
        label="Δ vs. forrige bølge"
        value={delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
        tone={deltaTone}
      />
      <PulseKpiCard
        label="Konti målt i rollup"
        value={`${measured} / ${rollupTotal}`}
        tone={covTone}
      />
      <PulseKpiCard label="< 40 (kritisk)" value={String(atRisk)} tone={riskTone} />
      <PulseKpiCard label="Opad (+2 eller mere)" value={String(improving)} tone={upliftTone} />
      <PulseKpiCard
        label="Promoter-andel"
        value={formatPercent(promoterRatio)}
        tone={promoterRatio >= 0.45 ? "ok" : promoterRatio >= 0.3 ? "warn" : "bad"}
      />
      <PulseKpiCard
        label="Passiv-andel"
        value={formatPercent(passiveRatio)}
        tone="brand"
      />
      <PulseKpiCard
        label="Detraktor-andel"
        value={formatPercent(detractorRatio)}
        tone={detractorRatio > 0.15 ? "bad" : detractorRatio > 0 ? "warn" : "ok"}
      />
      <PulseKpiCard label={responseRateLabel} value={formatPercent(responseRate)} tone="brand" />
      <PulseKpiCard label={invitationsLabel} value={String(invitations)} tone="brand" />
      <PulseKpiCard label="Svar modtaget" value={String(responses)} tone="ok" />
      <PulseKpiCard
        label="Median svartid"
        value={`${medianHoursToRespond} t`}
        tone={medianHoursToRespond <= 48 ? "ok" : "warn"}
      />
      <PulseKpiCard
        label="NPS‑alerts på Pulse"
        value={String(pulseAlertCount)}
        tone={pulseAlertCount > 0 ? "warn" : "ok"}
      />
      <p className={cn("col-span-full font-sans text-[11px] text-fg-quiet")}>
        Score-skala følger kundekortene: <span className="font-semibold text-fg">≥50 sund</span>, 40–49 observation,{" "}
        <span className="text-agency-bad">&lt;40 kritisk</span>.
      </p>
    </section>
  );
}
