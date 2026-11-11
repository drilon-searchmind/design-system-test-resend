import { UpsellDetails } from "@/components/clients/retainer-with-upsell";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import Link from "next/link";

import { routes } from "@/config/routes";
import {
  contractDaysUntilRenewal,
  CONTRACT_DEMO_REF_DATE,
} from "@/lib/crm/contract-utils";
import { formatCurrency, formatCurrencyCompact, formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * Kontrakt + økonomi (primær aftale fra mock `CONTRACTS`).
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   contract:
 *     | {
 *         id: string;
 *         kind: string;
 *         monthlyValue: number;
 *         currency: string;
 *         renewalAt: string;
 *         accountStatus: string;
 *         noticeDays: number;
 *         documentUrl?: string | null;
 *         signedBy?: string | null;
 *       }
 *     | undefined
 *     | null;
 *   contractDetailHref?: string | null;
 * }} props
 */
export function ClientDetailCommercialCard({ client, contract, contractDetailHref }) {
  const renewalIso = contract?.renewalAt ?? client.renewalAt;
  // De fleste aftaler er løbende uden fornyelse — så er feltet tomt.
  const hasRenewal = Boolean(renewalIso);
  const renewalDays = hasRenewal ? contractDaysUntilRenewal(renewalIso) : 0;
  const activeCommercially = contract?.accountStatus === "active" || (!contract && client.status === "active");
  const primaryContractHref =
    contractDetailHref === null
      ? null
      : contractDetailHref ?? (contract?.id ? `${routes.contracts}/${contract.id}` : null);
  const renewalSubTone =
    renewalDays < 0
      ? "text-agency-bad"
      : renewalDays <= 30 && activeCommercially
        ? "text-agency-warn"
        : "text-fg-quiet";

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Kontrakt & økonomi
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {primaryContractHref ? (
            <Link
              href={primaryContractHref}
              className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
            >
              Åbn aftale-detajler →
            </Link>
          ) : null}
          <Link
            href={routes.contracts}
            className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
          >
            Alle kontrakter →
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-10">
        <dl className="grid gap-x-10 gap-y-4 text-[11px] text-fg-muted sm:grid-cols-2">
          <div>
            <dt className="text-fg-soft">Retainer (aftalt)</dt>
            <dd className="mt-1 text-lg tabular-nums text-fg">
              {formatCurrency(client.retainer, client.currency)}
              <span className="font-sans text-sm font-normal text-fg-muted"> / md</span>
              {client.upsellMonth?.amount > 0 ?
                <span className="ml-2 text-sm text-fg-muted">
                  (+{formatCurrency(client.upsellMonth.amount, client.currency)}{" "}
                  <CrmHoverPopover
                    align="start"
                    title="Opsalg i denne periode"
                    content={<UpsellDetails items={client.upsellMonth.items} currency={client.currency} />}
                    triggerClassName="inline-flex"
                  >
                    <span className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-fg-soft">
                      i
                    </span>
                  </CrmHoverPopover>
                  )
                </span>
              : null}
            </dd>
            <dd className="mt-1 text-[10px] text-fg-quiet">
              Compact: {formatCurrencyCompact(client.retainer, client.currency)}
              {typeof client.retainerFromContracts === "number" && client.retainerFromContracts > 0 ? (
                <>
                  {" "}
                  · Statisk {formatCurrencyCompact(client.retainerBase ?? 0, client.currency)} + kontrakter{" "}
                  {formatCurrencyCompact(client.retainerFromContracts, client.currency)}
                </>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-fg-soft">Valuta</dt>
            <dd className="mt-1 tabular-nums text-fg">{client.currency}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Næste fornyelse</dt>
            <dd className="mt-1 tabular-nums text-fg">
              {hasRenewal ? formatIsoDateDa(renewalIso) : ""}
            </dd>
            {hasRenewal ?
              <dd className={cn("mt-1 text-[10px] tabular-nums", renewalSubTone)}>
                {client.status !== "active" ? (
                  <span>Ingen aktiv nedtælling (konto: {client.status})</span>
                ) : renewalDays < 0 ? (
                  <span>Fornyelse passeret ({Math.abs(renewalDays)} d siden vs. ref. {CONTRACT_DEMO_REF_DATE})</span>
                ) : (
                  <span>Om ca. {renewalDays} d</span>
                )}
              </dd>
            : null}
          </div>
          <div className="sm:col-span-2">
            <dt className="text-fg-soft">{client.isGroup ? "Koncern (CVR)" : "Kundenøgle"}</dt>
            <dd className="mt-1 text-[13px] text-fg-muted">{client.isGroup ? (client.cvrs?.join(", ") || "Manuel koncern") : client.id}</dd>
            {contract ? (
              <dd className="mt-2 text-[11px] text-fg-soft">
                Kontrakt <span className="tabular-nums text-fg-muted">{contract.id}</span> · Opsigelse{" "}
                {contract.noticeDays} kalenderdage · Konto-understatus matchet på status-chip
              </dd>
            ) : null}
          </div>
        </dl>

        {contract ? (
          <div className="rounded-xl border border-border-soft bg-surface-muted/35 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Primær aftale (afspegning)
            </h3>
            <ul className="mt-3 space-y-2 font-sans text-[13px] text-fg-muted">
              <li>
                <span className="font-medium text-fg">Form:</span> {contract.kind}
              </li>
              <li>
                <span className="font-medium text-fg">Beløb / md:</span>{" "}
                <span className="tabular-nums text-fg">
                  {formatCurrency(contract.monthlyValue, contract.currency)}
                </span>
              </li>
              {contract.renewalAt ?
                <li>
                  <span className="font-medium text-fg">Aftalt fornyelsesdato:</span>{" "}
                  <span className="tabular-nums">{formatIsoDateDa(contract.renewalAt)}</span>
                </li>
              : null}
              {contract.signedBy ? (
                <li>
                  <span className="font-medium text-fg">Underskrevet af:</span> {contract.signedBy}
                </li>
              ) : null}
              {contract.documentUrl ? (
                <li>
                  <a
                    href={contract.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-agency-brand hover:underline"
                  >
                    Se kontrakt →
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted/20 px-4 py-5 text-[13px] text-fg-muted">
            {client.isGroup ?
              "Aftaler og kontrakter administreres pr. brand — åbn et brand for at se dets aftale. MRR og fornyelse her er samlet for koncernen."
            : "Ingen matchet kontraktræk for denne kunde."}
          </div>
        )}
      </div>
    </div>
  );
}
