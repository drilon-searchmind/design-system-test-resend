"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function TaskConfirmCard({ data, onAction }) {
  const [status, setStatus] = useState(data.status ?? "pending");

  function handleConfirm() {
    setStatus("confirmed");
    if (data.doneFeedId) onAction?.(data.doneFeedId);
  }

  return (
    <div className={cn(
      "mt-2 rounded-xl border p-4",
      status === "confirmed" ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-card shadow-inset-card",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">Opgave · {data.client}</p>
          <p className="mt-0.5 font-sans text-[14px] font-semibold text-fg">{data.title}</p>
        </div>
        {status === "confirmed" ? (
          <span className="shrink-0 rounded-full bg-agency-ok-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-agency-ok">
            ✅ Oprettet
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-sans text-[12px] text-fg-muted">
        <span><span className="font-medium text-fg">Ansvarlig:</span> {data.assignee}</span>
        <span><span className="font-medium text-fg">Deadline:</span> {data.deadline}</span>
        {data.budget ? <span><span className="font-medium text-fg">Budget:</span> {data.budget}</span> : null}
        {data.priority ? <span><span className="font-medium text-fg">Prioritet:</span> {data.priority}</span> : null}
      </div>

      <ul className="mt-3 space-y-1">
        {data.tasks.map((t, i) => (
          <li key={i} className="flex items-start gap-2 font-sans text-[12.5px] text-fg">
            <span className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded border text-center text-[10px] leading-[14px]",
              status === "confirmed" ? "border-agency-ok text-agency-ok" : "border-border text-fg-muted",
            )}>
              {status === "confirmed" ? "✓" : i + 1}
            </span>
            {t}
          </li>
        ))}
      </ul>

      {status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-solid-cta-bg px-4 py-1.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
          >
            Bekræft og opret
          </button>
          <button
            type="button"
            className="rounded-full border border-border px-4 py-1.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            Rediger
          </button>
        </div>
      ) : null}
    </div>
  );
}
