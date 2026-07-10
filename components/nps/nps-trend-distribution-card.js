"use client";

import { NpsHeaderHint } from "@/components/nps/nps-header-hint";
import { NpsAgencyTrendChart } from "@/components/nps/nps-agency-trend-chart";
import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   trend: number[];
 *   trendLabels?: string[];
 *   promoters: number;
 *   passive: number;
 *   detractors: number;
 *   withData: number;
 * }} props
 */
export function NpsTrendAndDistributionCard({ trend, trendLabels = [], promoters, passive, detractors, withData }) {
  const n = Math.max(1, withData);
  const p = promoters / n;
  const q = passive / n;
  const r = detractors / n;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-stretch">
      <div className="flex flex-col tally-panel p-4 md:p-5">
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">
            <NpsHeaderHint label="Bureau-trend (12 måneder)" title="Bureau-trend">
              Månedligt gennemsnit af seneste kundescore pr. måned — beregnet fra NPS-historik i databasen.
            </NpsHeaderHint>
          </h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Reel aggregering fra kundehistorik — ikke mock-data.</p>
        </div>
        <NpsAgencyTrendChart values={trend} labels={trendLabels} />
      </div>

      <div className="flex flex-col tally-panel p-4 md:p-5">
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">Fordeling — seneste score</h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">
            Promoter ≥60 · passiv 40–59 · detraktor &lt;40 pr. konto.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-muted-strong">
            <div className="h-full bg-agency-ok transition-[width] duration-300" style={{ width: `${p * 100}%` }} />
            <div className="h-full bg-agency-warn" style={{ width: `${q * 100}%` }} />
            <div className="h-full bg-agency-bad" style={{ width: `${r * 100}%` }} />
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
              Ingen NPS-historik i rollup endnu.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
