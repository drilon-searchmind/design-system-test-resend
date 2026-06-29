"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function kr(n) {
  return new Intl.NumberFormat("da-DK").format(n) + " kr";
}

function Bar({ label, valueLabel, pct, tone }) {
  const toneBar = tone === "bad" ? "bg-agency-bad" : tone === "warn" ? "bg-accent-gold" : "bg-accent";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-fg-muted">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-fg">{valueLabel}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted-strong">
        <div className={cn("h-full rounded-full", toneBar)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/** @param {{ data: any }} props */
export function PacingCard({ data }) {
  const [capped, setCapped] = useState(false);
  const spendPct = Math.round((data.spent / data.budget) * 100);
  const timePct = Math.round((data.daysElapsed / data.daysTotal) * 100);

  return (
    <div className="mt-2 rounded-xl border border-border bg-surface-card p-4 shadow-inset-card">
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-soft">{data.budgetLabel}</p>

      <div className="mt-3 space-y-3">
        <Bar label="Forbrug" valueLabel={`${kr(data.spent)} / ${kr(data.budget)} · ${spendPct}%`} pct={spendPct} tone="warn" />
        <Bar label="Tid forløbet" valueLabel={`${data.daysElapsed} / ${data.daysTotal} dage · ${timePct}%`} pct={timePct} tone="brand" />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-2">
        <span className="font-sans text-[12px] text-fg-muted">Projektion ved nuværende tempo</span>
        <span className="font-mono text-[12px] font-semibold text-agency-warn">{data.projection}</span>
      </div>

      <p className="mt-3 font-sans text-[12px] leading-relaxed text-fg-muted">{data.recommendation}</p>

      <div className="mt-3 flex gap-2">
        {capped ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Dagsbudget-loft sat</span>
        ) : (
          <button
            type="button"
            onClick={() => setCapped(true)}
            className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
          >
            Sæt dagsbudget-loft
          </button>
        )}
      </div>
    </div>
  );
}
