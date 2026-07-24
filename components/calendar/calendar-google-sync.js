"use client";

import { useCallback, useState } from "react";

import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   status: { connected?: boolean; connectedAt?: string | null; available?: boolean; error?: string };
 *   showGoogleEvents: boolean;
 *   onShowGoogleEventsChange: (v: boolean) => void;
 *   onStatusChange: () => void;
 * }} props
 */
export function CalendarGoogleSync({
  status,
  showGoogleEvents,
  onShowGoogleEventsChange,
  onStatusChange,
}) {
  const [busy, setBusy] = useState(false);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      const qs = databaseApiQuery();
      await fetch(`/api/calendar/google/status?${qs}`, { method: "POST" });
      onStatusChange();
    } finally {
      setBusy(false);
    }
  }, [onStatusChange]);

  if (!status.available) {
    return (
      <span className="rounded-md border border-border bg-surface-muted px-3 py-1.5 font-sans text-[11px] text-fg-muted">
        Google Calendar (demo)
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-muted/50 px-3 py-2">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
        Google Calendar
      </span>
      {status.connected ?
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-agency-good-border bg-agency-good-soft px-2 py-0.5 text-[11px] text-agency-good">
            <span className="size-1.5 rounded-full bg-agency-good" aria-hidden />
            Forbundet
          </span>
          <label className="flex items-center gap-1.5 font-sans text-[12px] text-fg-muted">
            <input
              type="checkbox"
              checked={showGoogleEvents}
              onChange={(e) => onShowGoogleEventsChange(e.target.checked)}
              className="size-3.5 rounded border-border"
            />
            Vis begivenheder
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className={cn(
              "rounded-md border border-border px-2 py-1 font-sans text-[11px] text-fg-muted",
              "hover:border-agency-bad-border hover:text-agency-bad disabled:opacity-50",
            )}
          >
            Afbryd
          </button>
        </>
      : <a
          href="/api/calendar/google/connect"
          className={cn(
            "rounded-md border border-agency-brand-border bg-agency-brand-soft px-2.5 py-1",
            "font-sans text-[12px] font-medium text-agency-brand hover:bg-agency-brand-soft/80",
          )}
        >
          Forbind Google
        </a>
      }
      {status.error ?
        <span className="text-[11px] text-agency-warn">{status.error}</span>
      : null}
    </div>
  );
}
