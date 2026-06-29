import { cn } from "@/lib/utils";

const TONE = {
  ok:    { value: "text-agency-ok",   delta: "text-agency-ok",   bg: "bg-agency-ok-soft",   border: "border-agency-ok-border" },
  warn:  { value: "text-agency-warn", delta: "text-agency-warn", bg: "bg-agency-warn-soft", border: "border-agency-warn-border" },
  bad:   { value: "text-agency-bad",  delta: "text-agency-bad",  bg: "bg-agency-bad-soft",  border: "border-agency-bad-border" },
  brand: { value: "text-accent",      delta: "text-accent",      bg: "bg-surface-muted",    border: "border-border" },
};

function Sparkline({ data, tone }) {
  if (!data?.length) return null;
  const w = 200, h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = max === min ? 1 : (max - min) * 0.1;
  const lo = min - pad, hi = max + pad;
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - ((v - lo) / (hi - lo)) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  const t = TONE[tone] ?? TONE.brand;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", t.value)} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** @param {{ data: import('@/lib/demo/chat-scenarios').SparklineCardData }} props */
export function SparklineCard({ data }) {
  const t = TONE[data.tone] ?? TONE.brand;
  const sign = data.delta > 0 ? "+" : "";
  return (
    <div className={cn("mt-2 rounded-xl border p-4", t.border, t.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{data.label}</p>
          <p className={cn("mt-0.5 font-mono text-2xl font-semibold tabular-nums", t.value)}>{data.metric}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-xs font-semibold", t.bg, t.delta)}>
          {sign}{data.delta} %
        </span>
      </div>
      <div className={cn("mt-3", t.value)}>
        <Sparkline data={data.sparkData} tone={data.tone} />
      </div>
      {data.footnote ? (
        <p className="mt-2 font-sans text-[11px] text-fg-muted">{data.footnote}</p>
      ) : null}
    </div>
  );
}
