import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";

/**
 * @param {{
 *   total: number;
 *   active: number;
 *   invited: number;
 *   suspended: number;
 *   adminish: number;
 *   withMfa: number;
 *   mfaPct: number;
 * }} props
 */
export function UsersSummaryStrip({
  total,
  active,
  invited,
  suspended,
  adminish,
  withMfa,
  mfaPct,
}) {
  const suspTone = suspended > 0 ? "warn" : "ok";
  const inviteTone = invited > 2 ? "warn" : invited > 0 ? "brand" : "ok";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4 xl:gap-y-[length:var(--ds-studio-stack)]">
      <PulseKpiCard label="Konti i alt" value={String(total)} tone="brand" />
      <PulseKpiCard label="Aktive (Google / SSO)" value={String(active)} tone="ok" />
      <PulseKpiCard label="Invitationer åbne" value={String(invited)} tone={inviteTone} />
      <PulseKpiCard label="Suspenderet" value={String(suspended)} tone={suspTone} />
      <PulseKpiCard label="Administratorer (aktive)" value={String(adminish)} tone="brand" />
      <PulseKpiCard
        label={`Aktive med MFA`}
        value={`${withMfa} (${mfaPct}%)`}
        tone={mfaPct >= 85 ? "ok" : mfaPct >= 60 ? "warn" : "bad"}
      />
    </section>
  );
}
