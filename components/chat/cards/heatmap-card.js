"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function loadColor(ratio) {
  if (ratio >= 1)   return { bar: "bg-agency-bad",  track: "bg-agency-bad-soft" };
  if (ratio >= 0.9) return { bar: "bg-agency-warn", track: "bg-agency-warn-soft" };
  if (ratio >= 0.7) return { bar: "bg-accent-gold", track: "bg-surface-muted-strong" };
  return { bar: "bg-agency-ok", track: "bg-agency-ok-soft" };
}

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function HeatmapCard({ data, onAction }) {
  const [done, setDone] = useState(false);
  const targetFeedId = data.scheduledFeedId;

  function handleCta() {
    setDone(true);
    if (targetFeedId) onAction?.(targetFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      done ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          {data.specialist} · {data.role} · uge 25
        </p>
        {data.estimate ? (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-fg">
            Estimat: {data.estimate}
          </span>
        ) : null}
      </div>

      {/* Week columns */}
      <div className="flex items-end justify-between gap-2 px-4 pt-4">
        {data.days.map((d, i) => {
          const ratio = d.capacity ? d.booked / d.capacity : 0;
          const free = Math.max(0, d.capacity - d.booked);
          const c = loadColor(ratio);
          const fillPct = Math.min(100, Math.round(ratio * 100));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn("relative h-20 w-full overflow-hidden rounded-md", c.track)}>
                <div className={cn("absolute bottom-0 left-0 right-0", c.bar)} style={{ height: `${fillPct}%` }} />
              </div>
              <span className="font-mono text-[10px] text-fg-muted">{d.day}</span>
              <span className={cn("font-mono text-[9.5px] tabular-nums", free > 0 ? "text-agency-ok" : "text-fg-quiet")}>
                {free > 0 ? `${free} t fri` : "fuld"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3">
        <p className={cn(
          "rounded-lg px-3 py-2 font-sans text-[12px] leading-relaxed",
          data.overbooked ? "border border-agency-bad-border bg-agency-bad-soft text-agency-bad"
                          : "border border-agency-ok-border bg-agency-ok-soft text-agency-ok",
        )}>
          {data.overbooked ? "⚠ " : "✓ "}{data.recommendation}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {done ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Planlagt</span>
        ) : (
          <button
            type="button"
            onClick={handleCta}
            className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
          >
            {data.ctaLabel ?? "Planlæg i ledig tid"}
          </button>
        )}
      </div>
    </div>
  );
}
