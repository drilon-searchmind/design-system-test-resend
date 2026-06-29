import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   trend: number[];
 *   promoters: number;
 *   passive: number;
 *   detractors: number;
 *   withData: number;
 * }} props
 */
export function NpsTrendAndDistributionCard({ trend, promoters, passive, detractors, withData }) {
  const n = Math.max(1, withData);
  const p = promoters / n;
  const q = passive / n;
  const r = detractors / n;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-stretch">
      <div className="flex flex-col tally-panel p-4 md:p-5">
        <PulseCardHeader
          title="Bureau-trend (12 måneder)"
          sub="Sidste datapunkt = vægtet gennemsnit af aktive målinger — Geist Mono / tabular (Agency OS)."
        />
        <div className="mt-4 text-agency-brand">
          <PulseSparkline data={trend} height={40} className="max-w-none" />
        </div>
        <p className="mt-3 text-[10px] text-fg-quiet">
          Min {Math.min(...trend).toFixed(1)} · Max {Math.max(...trend).toFixed(1)}
        </p>
      </div>

      <div className="flex flex-col tally-panel p-4 md:p-5">
        <PulseCardHeader
          title="Fordeling — seneste score pr. konto"
          sub="Baseret på sidste registrerede NPS for hver aktiv/pauseret konto med historik."
        />
        <div className="mt-4 space-y-3">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-muted-strong">
            <div
              className="h-full bg-agency-ok transition-[width] duration-300"
              style={{ width: `${p * 100}%` }}
              title={`Promoters ${formatPercent(p)}`}
            />
            <div
              className="h-full bg-agency-warn"
              style={{ width: `${q * 100}%` }}
              title={`Passive ${formatPercent(q)}`}
            />
            <div
              className="h-full bg-agency-bad"
              style={{ width: `${r * 100}%` }}
              title={`Detraktorer ${formatPercent(r)}`}
            />
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-[11.5px] text-fg-muted">
            <li className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-agency-ok" /> Promoters ({promoters}/{withData}){" "}
              <span className="tabular-nums text-fg">{formatPercent(p)}</span>
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-agency-warn" /> Passive ({passive}/{withData}){" "}
              <span className="tabular-nums text-fg">{formatPercent(q)}</span>
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-agency-bad" /> Detraktorer ({detractors}/{withData}){" "}
              <span className="tabular-nums text-fg">{formatPercent(r)}</span>
            </li>
          </ul>
          {withData === 0 ? (
            <p className={cn("rounded-lg border border-dashed border-border px-3 py-4 text-[12px] text-fg-muted")}>
              Ingen NPS‑historik i rollup endnu — eller alle konti mangler første måling.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
