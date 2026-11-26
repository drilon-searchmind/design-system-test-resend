"use client";

import { useSession } from "next-auth/react";

import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatCurrencyCompact } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * Hovedtal for den aktuelle filter-visning på kundelisten.
 * @param {{
 *   customers: Array<{
 *     status?: string;
 *     currency?: string;
 *     retainer?: number;
 *     health?: string;
 *     hoursThisMonth?: number;
 *     hoursBudget?: number;
 *   }>;
 * }} props
 */
export function ClientsSummaryStrip({ customers }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const activeClients = customers.filter((c) => c.status === "active");
  const activeRetainerDkk = activeClients.reduce(
    (sum, c) => sum + (c.currency === "DKK" || !c.currency ? Number(c.retainer) || 0 : 0),
    0,
  );
  const needsAttention = customers.filter(
    (c) => c.health !== "ok" || ((c.hoursBudget ?? 0) > 0 && (c.hoursThisMonth ?? 0) > (c.hoursBudget ?? 0)),
  ).length;

  return (
    <section
      className={cn(
        "grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2",
        isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      <PulseKpiCard label="Kunder i filter" value={String(customers.length)} tone="brand" />
      <PulseKpiCard label="Aktive i filter" value={String(activeClients.length)} tone="ok" />
      <PulseKpiCard
        label="Retainer (aktive, DKK)"
        value={formatCurrencyCompact(activeRetainerDkk)}
        tone="brand"
      />
      {isAdmin ?
        <PulseKpiCard
          label="Kræver handling"
          value={String(needsAttention)}
          tone={needsAttention > 0 ? "warn" : "ok"}
        />
      : null}
    </section>
  );
}
