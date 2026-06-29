import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { usePulseData } from "@/components/pulse/pulse-data-context";

export function PulseUtilTrendChart() {
  const { utilTrend: data, period } = usePulseData();
  const days = data.length;
  const maxVal = Math.max(...data.flatMap((d) => [d.billable + d.overhead]), 1) * 1.1;

  const w = 560;
  const h = 200;
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-trend-heading">
      <div id="pulse-trend-heading">
        <PulseCardHeader
          title={`Tid fordelt — ${days} dage`}
          sub={`Billable vs. overhead (${period.label.toLowerCase()}, timer/dag)`}
        />
      </div>

      <svg
        className="mt-3 w-full text-fg-muted"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={pad.l + cw}
            y1={pad.t + ch * (1 - t)}
            y2={pad.t + ch * (1 - t)}
            stroke="currentColor"
            strokeOpacity={0.18}
          />
        ))}

        {data.map((d, i) => {
          const bar = cw / data.length - 2;
          const x = pad.l + (i / data.length) * cw + 1;
          const h1 = (d.billable / maxVal) * ch;
          const h2 = (d.overhead / maxVal) * ch;
          return (
            <g key={i}>
              <rect
                x={x}
                y={pad.t + ch - h1}
                width={Math.max(bar, 1)}
                height={h1}
                fill="var(--agency-brand)"
                opacity={0.92}
                rx={1}
              />
              <rect
                x={x}
                y={pad.t + ch - h1 - h2}
                width={Math.max(bar, 1)}
                height={h2}
                fill="var(--agency-warn)"
                opacity={0.88}
                rx={1}
              />
            </g>
          );
        })}

        <text
          x={pad.l - 6}
          y={pad.t + 10}
          fontSize={10}
          fill="currentColor"
          fillOpacity={0.55}
          textAnchor="end"
          className="tabular-nums"
        >
          {Math.round(maxVal)}t
        </text>
        <text
          x={pad.l - 6}
          y={pad.t + ch - 2}
          fontSize={10}
          fill="currentColor"
          fillOpacity={0.55}
          textAnchor="end"
          className="tabular-nums"
        >
          0
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 font-sans text-[11.5px] text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-agency-brand" /> Billable
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-agency-warn" /> Overhead / non-billable
        </span>
      </div>
    </section>
  );
}
