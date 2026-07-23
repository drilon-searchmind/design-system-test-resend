"use client";

import Link from "next/link";

import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { CONTRACT_DEMO_REF_DATE } from "@/lib/crm/contract-utils";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   contract: {
 *     id: string;
 *     kind: string;
 *     clientName: string;
 *     clientLogo: string;
 *     clientHue: number;
 *     accountStatus: 'active' | 'paused' | 'inactive' | 'pending_signature';
 *     health: 'ok' | 'warn' | 'bad';
 *   };
 *   owner: { name: string; role: string; avatar: string; hue: number } | null;
 *   daysUntilRenewal: number;
 *   industry?: string;
 *   renewalReferenceIso?: string;
 *   trailing?: import('react').ReactNode;
 * }} props
 */
export function ContractDetailHeader({
  contract,
  owner,
  daysUntilRenewal,
  industry,
  renewalReferenceIso = CONTRACT_DEMO_REF_DATE,
  trailing,
}) {
  const countdown =
    contract.accountStatus !== "active"
      ? `Status ${contract.accountStatus}. Kalenderafstand til fornyelsesdato: ${daysUntilRenewal} d (${daysUntilRenewal < 0 ? "papir er overskredet" : " stadig aktiv dato på kontrakten"}).`
      : daysUntilRenewal < 0
        ? `Fornyelse overskredet med ${Math.abs(daysUntilRenewal)} d vs. reference ${renewalReferenceIso}`
        : daysUntilRenewal === 0
          ? "Fornyelse i dag "
          : `Ca. ${daysUntilRenewal} d til fornyelse (reference ${renewalReferenceIso})`;

  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link
          href={routes.contracts}
          className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
        >
          Kontrakter
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-fg">{contract.clientName}</span>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-[11px] text-fg-muted">{contract.id}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border",
              "text-sm font-semibold text-white md:size-[60px] md:text-[15px]",
            )}
            style={{
              background: `linear-gradient(135deg, oklch(62% 0.15 ${contract.clientHue}), oklch(52% 0.18 ${contract.clientHue + 28}))`,
            }}
          >
            {contract.clientLogo}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Aftale · {contract.kind}
            </p>
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">{contract.clientName}</h1>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {industry ? <span>{industry} · </span> : null}
              <span>{countdown}</span>
              {owner ? (
                <>
                  {" "}
                  · Ansvarlig:{" "}
                  <span className="text-fg">{owner.name}</span>
                  <span className="text-fg-muted"> ({owner.role})</span>
                </>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip status={contract.accountStatus} palette="agency" />
              <HealthChip health={contract.health} palette="agency" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">{trailing}</div>
      </header>
    </>
  );
}
