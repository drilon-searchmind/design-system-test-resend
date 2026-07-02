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
 *   activeClients: number;
 *   billableHoursMonth: number;
 *   teamWeeklyHours: number;
 *   teamMemberCount?: number;
 * }} props
 */
export function WorkloadSummaryStrip({
  assigned,
  tracked,
  capacity,
  openTasks,
  openHigh,
  openOverdue,
  activeClients,
  billableHoursMonth,
  teamWeeklyHours,
  teamMemberCount = 0,
}) {
  const util = assigned > 0 ? tracked / assigned : 0;
  const sellThrough = capacity > 0 ? assigned / capacity : 0;

  const utilTone = util > 1.05 ? "bad" : util > 0.95 ? "warn" : util >= 0.75 ? "ok" : "brand";
  const sellTone = sellThrough > 1 ? "bad" : sellThrough > 0.92 ? "warn" : sellThrough > 0.75 ? "ok" : "brand";
  const backlogTone = openOverdue > 0 ? "bad" : openHigh > 4 ? "warn" : openTasks > 12 ? "warn" : "ok";

  const fteApprox = teamWeeklyHours / 37;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-3">
      <PulseKpiCard
        label="Kontrakttimer tildelt (Σ pr. disciplin)"
        value={`${formatCompactNumber(assigned)} t`}
        tone="brand"
      />
      <PulseKpiCard
        label="Forbrug rapporteret (Σ)"
        value={`${formatCompactNumber(tracked)} t`}
        tone={tracked > assigned * 1.02 ? "warn" : "ok"}
      />
      <PulseKpiCard
        label="Forbrug / tildelt"
        value={assigned > 0 ? formatPercent(util) : "—"}
        tone={utilTone}
      />
      <PulseKpiCard label="Kapacitetsloft (Σ)" value={`${formatCompactNumber(capacity)} t/md`} tone="brand" />
      <PulseKpiCard
        label="Tildelt vs. kapacitet"
        value={capacity > 0 ? formatPercent(sellThrough) : "—"}
        tone={sellTone}
      />
      <PulseKpiCard
        label="Åbne opgaver"
        value={String(openTasks)}
        tone={backlogTone}
      />
      <PulseKpiCard
        label="Aktive kunder (pulse)"
        value={String(activeClients)}
        tone="ok"
      />
      <PulseKpiCard
        label="Billable timer (bureau md.)"
        value={`${formatCompactNumber(billableHoursMonth)} t`}
        tone="brand"
      />
      <PulseKpiCard
        label={`Team (${teamMemberCount} pers.) · uge Σ`}
        value={`${teamWeeklyHours} t (~${fteApprox.toFixed(1)} FTE)`}
        tone="ok"
      />
    </section>
  );
}
