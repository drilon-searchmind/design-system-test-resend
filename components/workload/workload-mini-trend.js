import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { UTIL_TREND } from "@/lib/crm/static-data";

/** @typedef {{ billable: number; overhead: number }} TrendPt */

/** @returns {TrendPt[]} */
function defaultTrendFromStatic() {
  return UTIL_TREND.map(({ billable, overhead }) => ({ billable, overhead }));
}

/** Kompakt bureau-trendsøjle — matcher Pulse &quot;timer fordelt&quot; for workload-kontekst. */
/**
 * @param {{ series?: TrendPt[] | null; useDemoFallback?: boolean }} props
 */
export function WorkloadMiniTrend({ series = null, useDemoFallback = false }) {
  const data =
    Array.isArray(series) && series.length > 0 ? series
    : useDemoFallback ? defaultTrendFromStatic()
    : [];
  const dayLabel = data.length > 0 ? `${data.length} dag${data.length === 1 ? "" : "e"}` : "ingen data";

  const subHint =
    series && Array.isArray(series) && series.length > 0
      ? "Fakturerbar vs. intern tid aggregeret pr. rapportperiode."
      : useDemoFallback
        ? "Fakturerbar vs. intern fra Pulse-fixtures."
        : "Ingen trenddata for perioden endnu.";

  if (data.length === 0) {
    return (
      <section className="tally-panel p-4 md:p-5" aria-labelledby="workload-mini-trend-heading">
        <div id="workload-mini-trend-heading">
          <PulseCardHeader title="Timer fordelt" sub={subHint} />
        </div>
        <p className="mt-3 font-sans text-[13px] text-fg-muted">{subHint}</p>
      </section>
    );
  }

  const maxVal = Math.max(...data.flatMap((d) => [d.billable + d.overhead]), 1) * 1.08;

  const w = 560;
  const h = 140;
  const pad = { l: 34, r: 10, t: 12, b: 16 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  return (
    <section
      className="tally-panel p-4 md:p-5"
      aria-labelledby="workload-mini-trend-heading"
    >
      <div id="workload-mini-trend-heading">
        <PulseCardHeader title={`Timer fordelt (${dayLabel})`} sub={subHint} />
      </div>

      <svg
        className="mt-3 w-full text-fg-muted"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {[0, 0.5, 1].map((t, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={pad.l + cw}
            y1={pad.t + ch * (1 - t)}
            y2={pad.t + ch * (1 - t)}
            stroke="currentColor"
            strokeOpacity={0.16}
          />
        ))}

        {data.map((d, i) => {
          const bar = cw / data.length - 1.5;
          const x = pad.l + (i / data.length) * cw + 0.75;
          const h1 = (d.billable / maxVal) * ch;
          const h2 = (d.overhead / maxVal) * ch;
          return (
            <g key={i}>
              <rect
                x={x}
                y={pad.t + ch - h1}
                width={Math.max(bar, 0.8)}
                height={h1}
                fill="var(--agency-brand)"
                opacity={0.9}
                rx={1}
              />
              <rect
                x={x}
                y={pad.t + ch - h1 - h2}
                width={Math.max(bar, 0.8)}
                height={h2}
                fill="var(--agency-warn)"
                opacity={0.85}
                rx={1}
              />
            </g>
          );
        })}

        <text
          x={pad.l - 4}
          y={pad.t + 10}
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.5}
          textAnchor="end"
          className="tabular-nums"
        >
          {Math.round(maxVal)}t
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 font-sans text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-agency-brand" /> Fakturerbar
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-agency-warn" /> Intern
        </span>
      </div>
    </section>
  );
}
