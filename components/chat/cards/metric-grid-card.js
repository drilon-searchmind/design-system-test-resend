import { cn } from "@/lib/utils";

const TONE_TEXT = {
  ok:    "text-agency-ok",
  warn:  "text-agency-warn",
  bad:   "text-agency-bad",
  brand: "text-accent",
};

/** @param {{ data: import('@/lib/demo/chat-scenarios').MetricGridCardData }} props */
export function MetricGridCard({ data }) {
  return (
    <div className="mt-2 rounded-xl border border-border bg-surface-card p-4 shadow-inset-card">
      {data.title ? (
        <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-soft">{data.title}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {data.metrics.map((m, i) => {
          const sign = m.delta != null && m.delta > 0 ? "+" : "";
          return (
            <div key={i} className="rounded-lg border border-border bg-surface-muted/40 p-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-muted">{m.label}</p>
              <p className={cn("mt-0.5 font-mono text-[18px] font-semibold tabular-nums", TONE_TEXT[m.tone] ?? "text-fg")}>
                {m.value}
              </p>
              {m.delta != null ? (
                <p className={cn("mt-0.5 font-mono text-[11px]", TONE_TEXT[m.tone] ?? "text-fg-muted")}>
                  {sign}{m.delta} % vs. forrige
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
