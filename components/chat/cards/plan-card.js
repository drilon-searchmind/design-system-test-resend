"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function PlanCard({ data, onAction }) {
  const [approved, setApproved] = useState(false);

  function handleApprove() {
    setApproved(true);
    if (data.approvedFeedId) onAction?.(data.approvedFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      approved ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          {data.client} · Plan
        </p>
        <p className="mt-1 font-sans text-[13px] font-semibold text-fg">🎯 {data.goal}</p>
      </div>

      <div className="relative px-4 py-3">
        {/* timeline spine */}
        <div className="absolute bottom-4 left-[22px] top-4 w-px bg-border" aria-hidden />
        <div className="space-y-3">
          {data.phases.map((phase, i) => (
            <div key={i} className="relative flex gap-3">
              <span className="z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-solid-cta-bg bg-canvas">
                <span className="h-1.5 w-1.5 rounded-full bg-solid-cta-bg" />
              </span>
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface-muted/40 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-sans text-[13px] font-semibold text-fg">{phase.period}</p>
                  <span className="font-mono text-[10.5px] uppercase tracking-wide text-accent">{phase.focus}</span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {phase.items.map((it, j) => (
                    <li key={j} className="flex items-start gap-1.5 font-sans text-[12px] text-fg-muted">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
                      {it}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-4 font-mono text-[11px] tabular-nums">
                  <span className="text-fg-muted">Budget: <span className="text-fg">{phase.budget}</span></span>
                  <span className="text-fg-muted">Omsætning: <span className="text-agency-ok">{phase.revenue}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {approved ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Plan godkendt</span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleApprove}
              className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
            >
              Godkend plan
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Juster budget
            </button>
          </>
        )}
      </div>
    </div>
  );
}
