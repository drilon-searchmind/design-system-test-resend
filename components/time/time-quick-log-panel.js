"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { TimeEntryCreateForm } from "@/components/time/time-entry-create-form";
import { OpenTimerButton } from "@/components/time/open-timer-button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   dataSource?: string;
 *   departments?: Record<string, unknown>[];
 *   clientsPicklist?: Array<{ value: string; label: string }>;
 *   tasksPicklist?: Array<{ value: string; label: string; clientSlug?: string }>;
 *   onCreated?: () => Promise<void> | void;
 * }} props
 */
export function TimeQuickLogPanel({
  dataSource = "demo",
  departments = [],
  clientsPicklist = [],
  tasksPicklist = [],
  onCreated,
}) {
  const router = useRouter();
  const db = dataSource === "database";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [panelKey, setPanelKey] = useState(0);

  const handleSubmit = useCallback(
    async (body) => {
      if (!db) return;
      setSubmitting(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ includeTest: "1" });
        const res = await fetch(`/api/time-entries?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");

        /** @typedef {{ mongoId?: string; id?: string }} Wire */
        const w = typeof data?.wire === "object" && data?.wire ? /** @type {Wire} */ (data.wire) : {};
        const id = typeof w.mongoId === "string" && w.mongoId.trim() ? w.mongoId.trim() : typeof w.id === "string" ? w.id : "";
        if (onCreated) await onCreated();
        setPanelKey((k) => k + 1);
        if (id) router.push(`${routes.time}/${encodeURIComponent(id)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fejl");
      } finally {
        setSubmitting(false);
      }
    },
    [db, onCreated, router],
  );

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Hurtig log
          </h2>
          <p className="mt-1 max-w-prose font-sans text-[11px] leading-snug text-fg-muted">
            {db ?
              "Manuel registrering på panellet — også tilgængelig fra knappen Ny registrering i headeren."
            : "Manuel registrering er ikke tilgængelig i denne visning."}
          </p>
        </div>
        <OpenTimerButton className="inline-flex h-8 items-center gap-2 rounded-md border border-agency-brand-border bg-agency-brand px-3.5 font-sans text-[12px] font-semibold text-white transition-colors hover:bg-agency-brand/90">
          <span className="relative flex size-2 rounded-full bg-white/90">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
          </span>
          Start timer
        </OpenTimerButton>
      </div>

      {db ?
        <div className="mt-5 border-t border-border-soft pt-4">
          <TimeEntryCreateForm
            key={panelKey}
            departments={departments}
            clientsPicklist={clientsPicklist}
            tasksPicklist={tasksPicklist}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
            onCancel={() => {}}
            variant="card"
          />
        </div>
      :
        <div className="mt-5 grid gap-3 border-t border-border-soft pt-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Kunde</span>
            <select
              disabled
              className={cn(
                "h-8 cursor-not-allowed rounded-md border border-border bg-surface-muted px-2",
                "font-sans text-[13px] text-fg-muted opacity-70",
              )}
              title="Ikke tilgængelig"
            >
              <option>Vælg kunde…</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Minutter</span>
            <input
              type="text"
              disabled
              placeholder="fx 45"
              title="Ikke tilgængelig"
              className={cn(
                "h-8 cursor-not-allowed rounded-md border border-border bg-surface-muted px-2",
                "text-[13px] text-fg-muted opacity-70",
              )}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Note</span>
            <input
              type="text"
              disabled
              placeholder="Hvad blev der leveret?"
              title="Ikke tilgængelig"
              className={cn(
                "h-8 cursor-not-allowed rounded-md border border-border bg-surface-muted px-2",
                "font-sans text-[13px] text-fg-muted opacity-70",
              )}
            />
          </label>
        </div>
      }
    </section>
  );
}
