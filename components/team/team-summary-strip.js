import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";

/**
 * @param {{
 *   headcount: number;
 *   weeklyHoursSum: number;
 *   disciplineCount: number;
 *   partTimeCount: number;
 *   highLoadCount: number;
 *   avgWeeklyHours: number;
 *   fteApprox: number;
 *   openTasksTotal: number;
 * }} props
 */
export function TeamSummaryStrip({
  headcount,
  weeklyHoursSum,
  disciplineCount,
  partTimeCount,
  highLoadCount,
  avgWeeklyHours,
  fteApprox,
  openTasksTotal,
}) {
  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard label="Medarbejdere i roster" value={String(headcount)} tone="brand" />
      <PulseKpiCard label="Ugetimer i alt" value={`${weeklyHoursSum} t · ≈${fteApprox.toFixed(1)} FTE`} tone="ok" />
      <PulseKpiCard label="Discipliner repræsenteret" value={String(disciplineCount)} tone="ok" />
      <PulseKpiCard
        label="Deltid (< 37 h)"
        value={String(partTimeCount)}
        tone={partTimeCount > 2 ? "warn" : "ok"}
      />
      <PulseKpiCard label="Gns. ugentlige timer" value={`${avgWeeklyHours} t`} tone="brand" />
      <PulseKpiCard
        label="Høj belægning (≥82)"
        value={String(highLoadCount)}
        tone={highLoadCount > 4 ? "warn" : highLoadCount > 0 ? "ok" : "brand"}
      />
      <PulseKpiCard label="Åbne opgaver (roster)" value={String(openTasksTotal)} tone="brand" />
    </section>
  );
}
