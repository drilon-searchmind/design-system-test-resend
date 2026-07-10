import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatCompactNumber, formatPercent } from "@/lib/crm/format-da";

/**
 * @param {{
 *   assigned: number;
 *   tracked: number;
 *   capacity: number;
 *   openTasks: number;
 *   openHigh: number;
 *   openOverdue: number;
 *   billableHoursMonth: number;
 * }} props
 */
export function WorkloadSummaryStrip({
  assigned,
  tracked,
  capacity,
  openTasks,
  openHigh,
  openOverdue,
  billableHoursMonth,
}) {
  const util = assigned > 0 ? tracked / assigned : 0;
  const sellThrough = capacity > 0 ? assigned / capacity : 0;

  const utilTone = util > 1.05 ? "bad" : util > 0.95 ? "warn" : util >= 0.75 ? "ok" : "brand";
  const sellTone = sellThrough > 1 ? "bad" : sellThrough > 0.92 ? "warn" : sellThrough > 0.75 ? "ok" : "brand";
  const backlogTone = openOverdue > 0 ? "bad" : openHigh > 4 ? "warn" : openTasks > 12 ? "warn" : "ok";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard label="Åbne opgaver" value={String(openTasks)} tone={backlogTone} />
      <PulseKpiCard
        label="Forbrug / tildelt"
        value={assigned > 0 ? formatPercent(util) : "—"}
        tone={utilTone}
      />
      <PulseKpiCard
        label="Tildelt vs. kapacitet"
        value={capacity > 0 ? formatPercent(sellThrough) : "—"}
        tone={sellTone}
      />
      <PulseKpiCard
        label="Fakturerbare timer"
        value={`${formatCompactNumber(billableHoursMonth)} t`}
        tone="brand"
      />
    </section>
  );
}
