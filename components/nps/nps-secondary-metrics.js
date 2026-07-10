"use client";

import { useState } from "react";

import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   improving: number;
 *   invitations: number;
 *   responses: number;
 *   medianHoursToRespond: number;
 *   invitationsLabel?: string;
 * }} props
 */
export function NpsSecondaryMetrics({
  improving,
  invitations,
  responses,
  medianHoursToRespond,
  invitationsLabel = "Invitationer",
}) {
  const [open, setOpen] = useState(false);
  const upliftTone = improving >= 4 ? "ok" : improving > 0 ? "brand" : "warn";

  return (
    <section className="tally-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-muted/40"
      >
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">Detaljerede målinger</h2>
          <p className="mt-0.5 font-sans text-[11px] text-fg-muted">
            Invitationer, svartid og forbedrede konti.
          </p>
        </div>
        <span className="text-[11px] font-medium text-agency-brand">{open ? "Skjul" : "Vis"}</span>
      </button>

      <div
        className={cn(
          "grid gap-[length:var(--ds-studio-stack)] p-4 sm:grid-cols-2 xl:grid-cols-4",
          open ? "grid" : "hidden",
        )}
      >
        <PulseKpiCard label="Opad (+2 eller mere)" value={String(improving)} tone={upliftTone} />
        <PulseKpiCard label={invitationsLabel} value={String(invitations)} tone="brand" />
        <PulseKpiCard label="Svar modtaget" value={String(responses)} tone="ok" />
        <PulseKpiCard
          label="Median svartid"
          value={`${medianHoursToRespond} t`}
          tone={medianHoursToRespond <= 48 ? "ok" : "warn"}
        />
      </div>
    </section>
  );
}
