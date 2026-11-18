"use client";

import { parseQuickNumber, patchClient, QuickEditPopover } from "@/components/clients/client-quick-edit";
import { KpiTrendHover } from "@/components/crm/kpi-trend-hover";
import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatCurrency, formatCurrencyCompact, formatPercent, formatHoursCompactDa } from "@/lib/crm/format-da";

/**
 * @typedef {{
 *   hours?: import('@/components/crm/kpi-trend-hover').KpiTrendPoint[];
 *   nps?: import('@/components/crm/kpi-trend-hover').KpiTrendPoint[];
 *   tasksCreated?: import('@/components/crm/kpi-trend-hover').KpiTrendPoint[];
 *   mrr?: import('@/components/crm/kpi-trend-hover').KpiTrendPoint[];
 * }} ClientKpiTrends
 */

/**
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   timerLabel?: string;
 *   openTaskCount?: number;
 *   trends?: ClientKpiTrends | null;
 *   canEditRetainer?: boolean;
 *   onClientChanged?: () => void;
 * }} props
 */
export function ClientDetailKpiStrip({
  client,
  timerLabel = "Tid brugt",
  openTaskCount = 0,
  trends,
  canEditRetainer = false,
  onClientChanged,
}) {
  const marginTone =
    client.monthlyProfitMargin < 0 ? "bad" : client.monthlyProfitMargin < 0.15 ? "warn" : "ok";

  const lastNps =
    client.npsHistory?.length > 0
      ? client.npsHistory[client.npsHistory.length - 1]?.score
      : null;
  const npsTone =
    lastNps == null ? "brand" : lastNps >= 60 ? "ok" : lastNps >= 40 ? "warn" : "bad";

  const currency = client.currency ?? "DKK";
  const baseRetainer = client.retainerBase ?? client.retainer ?? 0;
  const contractRetainer = client.retainerFromContracts ?? 0;
  const formatMrr = (/** @type {number} */ v) => formatCurrencyCompact(v, currency);
  const formatHours = (/** @type {number} */ v) => `${formatHoursCompactDa(v)} t`;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-5">
      <KpiTrendHover title="MRR" points={trends?.mrr} format={formatMrr}>
        <QuickEditPopover
          title="Fast MRR retainer"
          canEdit={canEditRetainer}
          className="flex w-full"
          triggerClassName="block w-full"
          fields={[
            { name: "retainerAmount", label: `Fast retainer (${currency}/md)`, type: "number" },
            { name: "commercialNote", label: "Note (fx \"Opsalg: SEO-pakke\")" },
          ]}
          initialValues={{ retainerAmount: String(baseRetainer || ""), commercialNote: "" }}
          hint={
            contractRetainer > 0 ?
              `Signerede kontrakter lægges oveni: ${formatCurrency(contractRetainer, currency)}/md.`
            : "Ændringen logges i aftalehistorikken."
          }
          onSubmit={async (v) => {
            const amount = parseQuickNumber(v.retainerAmount);
            if (Number.isNaN(amount)) throw new Error("Ugyldigt beløb");
            await patchClient(client.id, { retainerAmount: amount ?? 0, commercialNote: v.commercialNote });
            onClientChanged?.();
          }}
        >
          <PulseKpiCard
            label="Retainer"
            value={`${formatCurrencyCompact(client.retainer, currency)} / md`}
            tone="brand"
            className="w-full"
          />
        </QuickEditPopover>
      </KpiTrendHover>
      <KpiTrendHover title={timerLabel} points={trends?.hours} format={formatHours}>
        <PulseKpiCard label={timerLabel} value={formatHours(client.hoursThisMonth)} tone="brand" />
      </KpiTrendHover>
      <PulseKpiCard label="Margin (md)" value={formatPercent(client.monthlyProfitMargin)} tone={marginTone} />
      <KpiTrendHover title="NPS" points={trends?.nps}>
        <PulseKpiCard
          label="Seneste NPS"
          value={lastNps != null ? String(lastNps) : "—"}
          tone={npsTone}
        />
      </KpiTrendHover>
      <KpiTrendHover title="Nye opgaver pr. måned" points={trends?.tasksCreated}>
        <PulseKpiCard label="Åbne opgaver" value={String(openTaskCount)} tone="brand" />
      </KpiTrendHover>
    </section>
  );
}
