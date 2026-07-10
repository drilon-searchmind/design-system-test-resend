"use client";

import { NpsHeaderHint } from "@/components/nps/nps-header-hint";

/**
 * @param {{ values: number[]; labels?: string[] }} props
 */
export function NpsAgencyTrendChart({ values, labels = [] }) {
  if (!values?.length) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center font-sans text-[12px] text-fg-muted">
        Ingen historik til trend endnu.
      </p>
    );
  }

  const w = 560;
  const h = 160;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const rangePad = max === min ? 2 : (max - min) * 0.12;
  const lo = min - rangePad;
  const hi = max + rangePad;

  const pts = values.map((v, i) => {
    const x = values.length === 1 ? pad.l + cw / 2 : pad.l + (i / (values.length - 1)) * cw;
    const y = pad.t + ch - ((v - lo) / (hi - lo)) * ch;
    return { x, y, v, label: labels[i] ?? "" };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pad.l + cw} ${pad.t + ch} L ${pad.l} ${pad.t + ch} Z`;

  const labelStep = values.length > 8 ? 2 : 1;

  return (
    <div className="mt-4">
      <svg className="w-full text-agency-brand" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        {[0, 0.5, 1].map((t, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={pad.l + cw}
            y1={pad.t + ch * (1 - t)}
            y2={pad.t + ch * (1 - t)}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        ))}

        <path d={area} fill="currentColor" opacity={0.1} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--canvas)" stroke="currentColor" strokeWidth={2} />
        ))}

        <text x={pad.l - 6} y={pad.t + 8} fontSize={9} fill="currentColor" fillOpacity={0.5} textAnchor="end" className="tabular-nums">
          {hi.toFixed(0)}
        </text>
        <text x={pad.l - 6} y={pad.t + ch} fontSize={9} fill="currentColor" fillOpacity={0.5} textAnchor="end" className="tabular-nums">
          {lo.toFixed(0)}
        </text>
      </svg>

      <div className="mt-1 flex justify-between gap-1 px-1 font-sans text-[9px] text-fg-quiet">
        {pts.map((p, i) =>
          i % labelStep === 0 || i === pts.length - 1 ?
            <span key={i} className="min-w-0 truncate text-center">
              {p.label}
            </span>
          : <span key={i} className="min-w-0" />,
        )}
      </div>

      <p className="mt-2 font-sans text-[10px] text-fg-quiet">
        Min {min.toFixed(1)} · Max {max.toFixed(1)} ·{" "}
        <NpsHeaderHint label="beregning" title="Bureau-trend">
          Månedligt gennemsnit af hver kontos seneste score pr. måned (aktiv + pauseret).
        </NpsHeaderHint>
      </p>
    </div>
  );
}
