"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TONE_TEXT = { ok: "text-agency-ok", warn: "text-agency-warn", bad: "text-agency-bad", brand: "text-accent" };

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function ReportCard({ data, onAction }) {
  const [shared, setShared] = useState(false);

  function handleShare() {
    setShared(true);
    if (data.sharedFeedId) onAction?.(data.sharedFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      shared ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          📊 Rapport · {data.client}
        </p>
        <p className="mt-0.5 font-sans text-[13px] font-semibold text-fg">{data.period}</p>
      </div>

      <div className="space-y-3 px-4 py-3">
        {data.sections.map((sec, i) => (
          <div key={i}>
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-accent">{sec.title}</p>
            {sec.metrics ? (
              <div className="grid grid-cols-3 gap-2">
                {sec.metrics.map((m, j) => {
                  const sign = m.delta != null && m.delta > 0 ? "+" : "";
                  return (
                    <div key={j} className="rounded-lg border border-border bg-surface-muted/40 p-2.5">
                      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.04em] text-fg-muted">{m.label}</p>
                      <p className={cn("mt-0.5 font-mono text-[14px] font-semibold tabular-nums", TONE_TEXT[m.tone] ?? "text-fg")}>{m.value}</p>
                      {m.delta != null ? (
                        <p className={cn("font-mono text-[10px]", TONE_TEXT[m.tone] ?? "text-fg-muted")}>{sign}{m.delta} %</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {sec.items ? (
              <ul className="space-y-0.5">
                {sec.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-1.5 font-sans text-[12.5px] text-fg">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {it}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {shared ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Delt med kunde</span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
            >
              Del med kunde
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Download PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
