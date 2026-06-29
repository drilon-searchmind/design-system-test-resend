"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TONE_TEXT = {
  ok:    "text-agency-ok",
  warn:  "text-agency-warn",
  bad:   "text-agency-bad",
  brand: "text-accent",
};

const LEVEL_STYLE = {
  Lav:     "text-agency-ok",
  God:     "text-agency-ok",
  Høj:     "text-agency-ok",
  Mellem:  "text-agency-warn",
};

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function OpportunityCard({ data, onAction }) {
  const [accepted, setAccepted] = useState(false);

  function handleAccept() {
    setAccepted(true);
    if (data.acceptedFeedId) onAction?.(data.acceptedFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      accepted ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <span className="inline-block rounded-full border border-solid-cta-bg bg-solid-cta-bg/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
            {data.kind}
          </span>
          <p className="mt-1.5 font-sans text-[14px] font-semibold text-fg">{data.title}</p>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="font-sans text-[12.5px] leading-relaxed text-fg-muted">{data.rationale}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {data.projections.map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-muted/40 p-2.5">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.04em] text-fg-muted">{p.label}</p>
              <p className={cn("mt-0.5 font-mono text-[14px] font-semibold tabular-nums", TONE_TEXT[p.tone] ?? "text-fg")}>
                {p.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-4 font-sans text-[12px]">
          <span className="text-fg-muted">Indsats: <span className={cn("font-medium", LEVEL_STYLE[data.effort] ?? "text-fg")}>{data.effort}</span></span>
          <span className="text-fg-muted">Effekt: <span className={cn("font-medium", LEVEL_STYLE[data.impact] ?? "text-fg")}>{data.impact}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {accepted ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Forslag oprettet</span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
            >
              Lav forslag til kunden
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Ikke nu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
