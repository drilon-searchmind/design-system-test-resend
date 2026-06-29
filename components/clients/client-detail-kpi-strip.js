import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number]; timerLabel?: string }} props
 */
export function ClientDetailKpiStrip({ client, timerLabel = "Timer denne md" }) {
  const utilRatio =
    client.hoursBudget > 0 ? client.hoursThisMonth / client.hoursBudget : 0;
  const timerTone = utilRatio > 1 ? "bad" : utilRatio > 0.9 ? "warn" : "ok";
  const marginTone =
    client.monthlyProfitMargin < 0 ? "bad" : client.monthlyProfitMargin < 0.15 ? "warn" : "ok";

  const lastNps =
    client.npsHistory?.length > 0
      ? client.npsHistory[client.npsHistory.length - 1]?.score
      : null;
  const npsTone =
    lastNps == null ? "brand" : lastNps >= 60 ? "ok" : lastNps >= 40 ? "warn" : "bad";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard
        label="Retainer"
        value={`${formatCurrencyCompact(client.retainer, client.currency)} / md`}
        tone="brand"
      />
      <PulseKpiCard
        label={timerLabel}
        value={`${client.hoursThisMonth} / ${client.hoursBudget} t`}
        tone={timerTone}
      />
      <PulseKpiCard label="Margin (md)" value={formatPercent(client.monthlyProfitMargin)} tone={marginTone} />
      <PulseKpiCard
        label="Seneste NPS"
        value={lastNps != null ? String(lastNps) : "—"}
        tone={npsTone}
      />
    </section>
  );
}
