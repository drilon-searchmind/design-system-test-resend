import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { routes } from "@/config/routes";
import { CONTRACT_DEMO_REF_DATE, contractDaysUntilRenewal } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact, formatIsoDateDa, formatPercent } from "@/lib/crm/format-da";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   contract: import('@/lib/crm/static-data').CONTRACTS[number];
 *   renewalReferenceIso?: string;
 * }} props
 */
export function ContractDetailLinkedClientCard({
  client,
  contract,
  renewalReferenceIso = CONTRACT_DEMO_REF_DATE,
}) {
  const owner = TEAM.find((t) => t.id === client.owner);
  const util = client.hoursBudget > 0 ? client.hoursThisMonth / client.hoursBudget : 0;

  const align =
    Math.abs(contract.monthlyValue - client.retainer) < 1 ||
    contract.monthlyValue === client.retainer;

  const renewalDelta =
    contract.accountStatus === "active"
      ? contractDaysUntilRenewal(contract.renewalAt, renewalReferenceIso)
      : null;

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Tilsluttet kunde
        </h2>
        <Link
          href={`${routes.clients}/${client.id}`}
          className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
        >
          Åbn kundeprofil →
        </Link>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border",
            "text-sm font-semibold text-white",
          )}
          style={{
            background: `linear-gradient(135deg, oklch(62% 0.15 ${contract.clientHue}), oklch(52% 0.18 ${contract.clientHue + 28}))`,
          }}
        >
          {contract.clientLogo}
        </span>
        <div className="min-w-0">
          <Link
            href={`${routes.clients}/${client.id}`}
            className="font-sans text-[16px] font-semibold text-fg underline-offset-4 hover:text-agency-brand hover:underline"
          >
            {client.name}
          </Link>
          <p className="font-sans text-[12px] text-fg-muted">{client.industry}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip status={client.status} palette="agency" />
            <HealthChip health={client.health} palette="agency" compact />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border-soft pt-4 text-[11px] text-fg-muted">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-fg-soft">Account lead</dt>
          <dd className="flex min-w-0 max-w-[60%] items-center justify-end gap-2 font-sans text-[12px] text-fg">
            {owner ? (
              <>
                <CrmAvatar label={owner.avatar} src={owner.image} hue={owner.hue} className="size-6 text-[8px]" />
                <span className="truncate">{owner.name}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-fg-soft">Retainer vs. kontrakt</dt>
          <dd className="text-right text-[11px] tabular-nums">
            <span className={align ? "text-agency-ok" : "text-agency-warn"}>{align ? "✓ Stemmer" : "⚠ Tjek linjer"}</span>
            <span className="mt-1 block text-[10px] font-normal text-fg-quiet">
              Kunde CRM {formatCurrencyCompact(client.retainer, client.currency)} · Aftale{" "}
              {formatCurrencyCompact(contract.monthlyValue, contract.currency)}
            </span>
          </dd>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-fg-soft">Timer (md)</dt>
          <dd className="text-[11px] tabular-nums text-fg">
            {client.hoursThisMonth} / {client.hoursBudget} t · {formatPercent(util)}
          </dd>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-fg-soft">Sidst aktiv</dt>
          <dd className="font-sans text-[11px] text-fg-muted">{client.lastActivity}</dd>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dt className="text-fg-soft">Fornyelse (kunden)</dt>
          <dd className="text-[11px] tabular-nums text-fg">
            {formatIsoDateDa(client.renewalAt)}
            {renewalDelta != null ? (
              <span className="mt-1 block text-[10px] text-fg-quiet">
                {renewalDelta} d vs. kontraktreference {renewalReferenceIso}
              </span>
            ) : (
              <span className="mt-1 block text-[10px] text-fg-quiet">Ikke aktiv fornyelsestæller</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
