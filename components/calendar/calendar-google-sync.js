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
    if (!window.confirm("Afbryd forbindelsen til Google Calendar?")) return;
    setBusy(true);
    try {
      const qs = databaseApiQuery();
      await fetch(`/api/calendar/google/status?${qs}`, { method: "POST" });
      onShowGoogleEventsChange(false);
      onStatusChange();
    } finally {
      setBusy(false);
    }
  }, [onShowGoogleEventsChange, onStatusChange]);

  if (!status.available) {
    return (
      <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5">
        <p className="font-sans text-[12px] text-fg-muted">Google Calendar er ikke tilgængelig i demo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[12px] font-semibold text-fg">Google Calendar</p>
          {status.connected ?
            <p className="mt-0.5 font-sans text-[11px] text-fg-muted">Synkroniseret med din konto</p>
          : <p className="mt-0.5 font-sans text-[11px] text-fg-muted">Vis dine Google-møder i kalenderen</p>}
        </div>
        {status.connected ?
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-agency-good-border bg-agency-good-soft px-2 py-0.5 font-sans text-[10px] font-medium text-agency-good">
            <span className="size-1.5 rounded-full bg-agency-good" aria-hidden />
            Forbundet
          </span>
        : null}
      </div>

      {status.error ?
        <p className="mt-2 rounded-md border border-agency-warn-border bg-agency-warn-soft px-2 py-1.5 font-sans text-[11px] text-agency-warn">
          {status.error}
        </p>
      : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
        {status.connected ?
          <>
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 font-sans text-[12px] transition-colors",
                showGoogleEvents ?
                  "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                : "border-border bg-canvas text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              <input
                type="checkbox"
                checked={showGoogleEvents}
                onChange={(e) => onShowGoogleEventsChange(e.target.checked)}
                className="size-3.5 rounded border-border accent-agency-brand"
              />
              Vis begivenheder
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className={cn(
                "rounded-lg border border-border bg-canvas px-2.5 py-1.5 font-sans text-[12px] text-fg-muted",
                "hover:border-agency-bad-border hover:text-agency-bad disabled:opacity-50",
              )}
            >
              {busy ? "Afbryder…" : "Afbryd"}
            </button>
          </>
        : <a
            href="/api/calendar/google/connect"
            className={cn(
              "inline-flex items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5",
              "font-sans text-[12px] font-semibold text-agency-brand transition-colors hover:bg-agency-brand-soft/80",
            )}
          >
            Forbind Google Calendar
          </a>
        }
      </div>
    </div>
  );
}
