import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { contractNeedsRenewalSoon } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact } from "@/lib/crm/format-da";

/**
 * @param {{
 *   contracts: Array<{
 *     accountStatus: string;
 *     renewalAt: string;
 *     monthlyValue: number;
 *     currency: string;
 *     signingState?: string;
 *   }>;
 *   summary?: {
 *     total: number;
 *     activeCount: number;
 *     mrrOverlapActiveDkk: number;
 *     renewalSoonCount: number;
 *     pendingSignatureCount?: number;
 *   } | null;
 *   renewalReferenceIso: string;
 * }} props
 */
export function ContractsSummaryStrip({ contracts = [], summary = null, renewalReferenceIso }) {
  const renewalSoon =
    summary?.renewalSoonCount ??
    contracts.filter((c) => contractNeedsRenewalSoon(c, 90, renewalReferenceIso)).length;

  const total = summary?.total ?? contracts.length;
  const activeCount =
    summary?.activeCount ?? contracts.filter((c) => c.accountStatus === "active").length;
  const pendingCount =
    summary?.pendingSignatureCount ??
    contracts.filter(
      (c) => c.accountStatus === "pending_signature" || c.signingState === "pending",
    ).length;

  const mrrOverlap =
    summary?.mrrOverlapActiveDkk ??
    contracts.reduce((sum, c) => {
      if (c.accountStatus !== "active" || c.currency !== "DKK") return sum;
      return sum + c.monthlyValue;
    }, 0);

  return (
    <section
      aria-label="Nøgletal for kontrakter"
      className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4"
    >
      <PulseKpiCard
        label={`Aktive aftaler · ${total} i alt`}
        value={String(activeCount)}
        tone="ok"
      />
      <PulseKpiCard
        label="Afventer underskrift"
        value={String(pendingCount)}
        tone={pendingCount > 0 ? "warn" : "brand"}
      />
      <PulseKpiCard
        label="MRR (aktive, valgt md.)"
        info={{
          title: "MRR fra kontrakter",
          body: "Summen af den månedlige værdi på aktive DKK-aftaler, der løber i den valgte måned. Årlige linjer tæller som 1/12 pr. måned; engangslinjer indgår ikke.",
        }}
        value={formatCurrencyCompact(mrrOverlap)}
        tone="brand"
      />
      <PulseKpiCard
        label="Fornyelse ≤90 d"
        value={String(renewalSoon)}
        tone={renewalSoon > 0 ? "warn" : "ok"}
      />
    </section>
  );
}
