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
  const renewalDays = contractDaysUntilRenewal(renewalIso);
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
            </dd>
            <dd className="mt-1 text-[10px] text-fg-quiet">
              Compact: {formatCurrencyCompact(client.retainer, client.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-fg-soft">Valuta</dt>
            <dd className="mt-1 tabular-nums text-fg">{client.currency}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Næste fornyelse</dt>
            <dd className="mt-1 tabular-nums text-fg">{formatIsoDateDa(client.renewalAt)}</dd>
            <dd className={cn("mt-1 text-[10px] tabular-nums", renewalSubTone)}>
              {client.status !== "active" ? (
                <span>Ingen aktiv nedtælling (konto: {client.status})</span>
              ) : renewalDays < 0 ? (
                <span>Fornyelse passeret ({Math.abs(renewalDays)} d siden vs. ref. {CONTRACT_DEMO_REF_DATE})</span>
              ) : (
                <span>Om ca. {renewalDays} d</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-fg-soft">Kundenøgle</dt>
            <dd className="mt-1 text-[13px] text-fg-muted">{client.id}</dd>
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
              <li>
                <span className="font-medium text-fg">Aftalt fornyelsesdato:</span>{" "}
                <span className="tabular-nums">{formatIsoDateDa(contract.renewalAt)}</span>
              </li>
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
            Ingen matchet kontraktræk for denne kunde.
          </div>
        )}
      </div>
    </div>
  );
}
