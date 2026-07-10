import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";

/**
 * @param {{
 *   summary: {
 *     total: number;
 *     activeCount: number;
 *     deptCoverageNum: number;
 *     deptCoverageDen: number;
 *     totalUsage: number;
 *   };
 * }} props
 */
export function TemplatesSummaryStrip({ summary }) {
  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard label="Skabeloner i alt" value={String(summary.total)} tone="brand" />
      <PulseKpiCard label="Aktive" value={String(summary.activeCount)} tone="ok" />
      <PulseKpiCard
        label="Discipliner repræsenteret"
        value={`${summary.deptCoverageNum} / ${summary.deptCoverageDen}`}
        tone={summary.deptCoverageNum >= summary.deptCoverageDen ? "ok" : "warn"}
      />
      <PulseKpiCard label="Brugt i opgaver (Σ)" value={String(summary.totalUsage)} tone="brand" />
    </section>
  );
}
