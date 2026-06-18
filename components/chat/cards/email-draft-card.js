"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function EmailDraftCard({ data, onAction }) {
  const [sent, setSent] = useState(false);

  function handleSend() {
    setSent(true);
    if (data.sentFeedId) onAction?.(data.sentFeedId);
  }

  return (
    <div className={cn(
      "mt-2 overflow-hidden rounded-xl border",
      sent ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="border-b border-border px-4 py-2.5">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          ✉️ E-mail-udkast
        </p>
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-2 font-sans text-[12px]">
          <span className="w-14 shrink-0 text-fg-muted">Til</span>
          <span className="text-fg">{data.to}</span>
        </div>
        <div className="flex gap-2 font-sans text-[12px]">
          <span className="w-14 shrink-0 text-fg-muted">Emne</span>
          <span className="font-medium text-fg">{data.subject}</span>
        </div>
        <div className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-surface-muted/40 p-3 font-sans text-[12.5px] leading-relaxed text-fg">
          {data.body}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {sent ? (
          <span className="font-mono text-[12px] font-semibold text-agency-ok">✅ Sendt</span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSend}
              className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
            >
              Send e-mail
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Rediger
            </button>
          </>
        )}
      </div>
    </div>
  );
}
