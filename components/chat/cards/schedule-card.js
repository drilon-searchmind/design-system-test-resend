"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** @param {{ data: any, onAction?: (feedId: string) => void }} props */
export function ScheduleCard({ data, onAction }) {
  const [booked, setBooked] = useState(/** @type {number|null} */ (null));

  function handleBook(i) {
    setBooked(i);
    if (data.bookedFeedId) onAction?.(data.bookedFeedId);
  }

  return (
    <div className="mt-2 rounded-xl border border-border bg-surface-card p-4 shadow-inset-card">
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-soft">{data.client} · Ledige slots</p>
      {data.warning ? (
        <p className="mt-2 rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-1.5 font-sans text-[12px] text-agency-warn">
          ⚠ {data.warning}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {data.slots.map((slot, i) => (
          <div key={i} className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
            booked === i ? "border-agency-ok-border bg-agency-ok-soft" : "border-border bg-surface-muted/40",
          )}>
            <div>
              <p className="font-sans text-[13px] font-medium text-fg">{slot.day}</p>
              <p className="font-mono text-[11px] text-fg-muted">{slot.time}</p>
              {slot.note ? <p className="font-sans text-[11px] text-fg-muted">{slot.note}</p> : null}
            </div>
            {booked === i ? (
              <span className="shrink-0 font-mono text-[12px] font-semibold text-agency-ok">✅ Booket</span>
            ) : (
              <button
                type="button"
                className="shrink-0 rounded-full bg-solid-cta-bg px-3 py-1 font-sans text-[12px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover disabled:opacity-40"
                onClick={() => handleBook(i)}
                disabled={booked != null}
              >
                Book
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
