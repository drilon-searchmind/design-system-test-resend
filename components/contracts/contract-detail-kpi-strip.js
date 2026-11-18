import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { contractDaysUntilRenewal } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact } from "@/lib/crm/format-da";

/**
 * @param {{
 *   contract: {
 *     monthlyValue: number;
 *     currency: string;
 *     renewalAt: string;
 *     accountStatus: 'active' | 'paused' | 'inactive';
 *     noticeDays: number;
 *   };
 *   renewalReferenceIso: string;
 *   referenceChipLabel?: string;
 *   referenceChipValue?: string;
 * }} props
 */
export function ContractDetailKpiStrip({
  contract,
  renewalReferenceIso,
  referenceChipLabel,
  referenceChipValue,
}) {
  const label = referenceChipLabel ?? "Kalender-reference";
  const valueChip = referenceChipValue ?? renewalReferenceIso;

  const days =
    contract.accountStatus === "active"
      ? contractDaysUntilRenewal(contract.renewalAt, renewalReferenceIso)
      : null;

  const renewalTone =
    contract.accountStatus !== "active"
      ? "brand"
      : days === null || !Number.isFinite(days)
        ? "brand"
        : days < 0
          ? "bad"
          : days <= 30
            ? "warn"
            : "ok";

  const renewalValue =
    contract.accountStatus === "pending_signature"
      ? "Afventer underskrift"
      : contract.accountStatus !== "active"
        ? "Ikke aktiv"
        : days === null || !Number.isFinite(days)
          ? "—"
          : days < 0
            ? `${Math.abs(days)} d over`
            : days === 0
              ? "I dag"
              : `Om ${days} d`;

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
      <PulseKpiCard
        label="Aftalt beløb / md"
        info={{
          title: "Månedlig værdi",
          body: "Løbende servicelinjer pr. måned. Årlige linjer tæller som 1/12 pr. måned; engangslinjer indgår ikke.",
        }}
        value={formatCurrencyCompact(contract.monthlyValue, contract.currency)}
        tone="brand"
      />
      <PulseKpiCard label="Fornyelse" value={renewalValue} tone={renewalTone} />
      <PulseKpiCard
        label="Opsigelsesvarsel"
        value={`${contract.noticeDays} d`}
        tone="brand"
      />
      <PulseKpiCard label={label} value={valueChip} tone="ok" />
    </section>
  );
}
