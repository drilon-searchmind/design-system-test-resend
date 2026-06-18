"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function RenewalCard({ data, onAction }) {
  const [prepared, setPrepared] = useState(false);

  function handlePrepare() {
    setPrepared(true);
    if (data.preparedFeedId) onAction?.(data.preparedFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      prepared ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">📄 Fornyelse · {data.client}</p>
          <p className="mt-0.5 font-sans text-[13px] font-semibold text-fg">{data.value} · {data.term}</p>
        </div>
        <span className="shrink-0 rounded-full border border-agency-warn-border bg-agency-warn-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-agency-warn">
          {data.expires}
        </span>
      </div>

      <div className="space-y-1.5 px-4 py-3">
        {data.terms.map((t, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 border-b border-border-muted pb-1.5 last:border-0 last:pb-0">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-fg-muted">{t.label}</span>
            <span className="text-right font-sans text-[12.5px] font-medium text-fg">{t.value}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3">
        <p className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2 font-sans text-[12px] leading-relaxed text-fg-muted">
          💡 {data.recommendation}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {prepared ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Oplæg klargjort</span>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePrepare}
              className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
            >
              Klargør oplæg
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Book fornyelsesmøde
            </button>
          </>
        )}
      </div>
    </div>
  );
}
