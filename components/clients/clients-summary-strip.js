import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { buildCustomerEntities } from "@/lib/crm/client-groups";
import { formatCurrencyCompact } from "@/lib/crm/format-da";

/**
 * @param {{ clients: import('@/lib/crm/pulse-types').PulseClient[] }} props
 */
export function ClientsSummaryStrip({ clients: brands }) {
  // Kundegrupper (brands med samme CVR) tæller som én kunde.
  const clients = buildCustomerEntities(brands);
  const activeClients = clients.filter((c) => c.status === "active");
  const activeRetainerDkk = activeClients.reduce((sum, c) => sum + (c.currency === "DKK" ? c.retainer : 0), 0);
  const needsAttention = clients.filter(
    (c) => c.health !== "ok" || (c.hoursBudget > 0 && c.hoursThisMonth > c.hoursBudget),
  ).length;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard label="Kunder i alt" value={String(clients.length)} tone="brand" />
      <PulseKpiCard label="Aktive konti" value={String(activeClients.length)} tone="ok" />
      <PulseKpiCard
        label="Retainer (aktive, DKK)"
        value={formatCurrencyCompact(activeRetainerDkk)}
        tone="brand"
      />
      <PulseKpiCard
        label="Kræver handling"
        value={String(needsAttention)}
        tone={needsAttention > 0 ? "warn" : "ok"}
      />
    </section>
  );
}
