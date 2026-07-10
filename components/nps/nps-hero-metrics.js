import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { NpsHeaderHint } from "@/components/nps/nps-header-hint";
import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const TONE_TEXT = {
  brand: "text-agency-brand",
  ok: "text-agency-ok",
  warn: "text-agency-warn",
  bad: "text-agency-bad",
};

/**
 * @param {{
 *   hintLabel: string;
 *   hintTitle: string;
 *   hintBody: string;
 *   value: string;
 *   tone?: 'brand' | 'ok' | 'warn' | 'bad';
 * }} props
 */
function NpsHintKpiCard({ hintLabel, hintTitle, hintBody, value, tone = "brand" }) {
  const accent = TONE_TEXT[tone] ?? TONE_TEXT.brand;
  return (
    <div className="tally-panel p-4 md:p-5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-soft">
        <NpsHeaderHint label={hintLabel} title={hintTitle}>
          {hintBody}
        </NpsHeaderHint>
      </p>
      <p className={cn("mt-2 font-sans text-[22px] font-semibold tabular-nums tracking-tight text-fg", accent)}>
        {value}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   avgLatest: number | null;
 *   avgPrev: number | null;
 *   measured: number;
 *   rollupTotal: number;
 *   atRisk: number;
 *   responseRate: number;
 *   responseRateLabel?: string;
 * }} props
 */
export function NpsHeroMetrics({
  avgLatest,
  avgPrev,
  measured,
  rollupTotal,
  atRisk,
  responseRate,
  responseRateLabel = "Svarfrekvens",
}) {
  const delta = avgLatest != null && avgPrev != null ? avgLatest - avgPrev : null;
  const deltaTone =
    delta == null ? "brand" : delta > 0.5 ? "ok" : delta < -0.5 ? "bad" : "warn";
  const latestTone =
    avgLatest == null ? "brand" : avgLatest >= 50 ? "ok" : avgLatest >= 40 ? "warn" : "bad";
  const covTone = measured >= rollupTotal * 0.9 ? "ok" : measured >= rollupTotal * 0.7 ? "warn" : "brand";
  const riskTone = atRisk > 2 ? "bad" : atRisk > 0 ? "warn" : "ok";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-5">
      <NpsHintKpiCard
        hintLabel="Bureau NPS"
        hintTitle="Bureau NPS"
        hintBody="Gennemsnit af hver kontos seneste score (0–100). ≥50 sund, 40–49 observation, under 40 kritisk."
        value={avgLatest != null ? avgLatest.toFixed(1) : "—"}
        tone={latestTone}
      />
      <NpsHintKpiCard
        hintLabel="Δ vs. forrige"
        hintTitle="Delta vs. forrige bølge"
        hintBody="Forskel mellem seneste og forrige måling pr. konto — gennemsnit på tværs af konti med to eller flere målinger."
        value={delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
        tone={deltaTone}
      />
      <NpsHintKpiCard
        hintLabel="Konti målt"
        hintTitle="Konti målt i rollup"
        hintBody="Antal konti med mindst én NPS-måling ud af alle aktive og pauserede kunder."
        value={`${measured} / ${rollupTotal}`}
        tone={covTone}
      />
      <PulseKpiCard label={responseRateLabel} value={formatPercent(responseRate)} tone="brand" />
      <NpsHintKpiCard
        hintLabel="< 40 (kritisk)"
        hintTitle="Kritiske konti"
        hintBody="Konti hvor seneste NPS-score er under 40."
        value={String(atRisk)}
        tone={riskTone}
      />
    </section>
  );
}
