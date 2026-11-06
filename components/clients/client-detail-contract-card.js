import Link from "next/link";

import { routes } from "@/config/routes";
import { formatCurrency, formatIsoDateDa } from "@/lib/crm/format-da";

/**
 * Kundens aftale i Kundeinfo: nøgleoplysninger, underskrift og link til kontrakten som PDF.
 *
 * @param {{
 *   contract:
 *     | (Record<string, any> & { id: string; kind: string; monthlyValue: number; currency: string })
 *     | null
 *     | undefined;
 *   isGroup?: boolean;
 * }} props
 */
export function ClientDetailContractCard({ contract, isGroup = false }) {
  const docId = contract?.mongoId ?? contract?.id;
  const signedLabel = contract?.signedAt ? formatIsoDateDa(contract.signedAt) : null;

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kontrakt</h2>
        {contract ?
          <Link
            href={`${routes.contracts}/${contract.id}`}
            className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
          >
            Åbn aftale-detaljer →
          </Link>
        : null}
      </div>

      {contract ?
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <dl className="grid gap-x-8 gap-y-3 text-[11px] text-fg-muted sm:grid-cols-2">
            <div>
              <dt className="text-fg-soft">Aftale</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">{contract.kind}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">Værdi / md</dt>
              <dd className="mt-1 tabular-nums text-[13px] text-fg">
                {formatCurrency(contract.monthlyValue, contract.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Opsigelse</dt>
              <dd className="mt-1 tabular-nums text-[13px] text-fg">{contract.noticeDays} dage</dd>
            </div>
            {contract.renewalAt ?
              <div>
                <dt className="text-fg-soft">Fornyelse</dt>
                <dd className="mt-1 tabular-nums text-[13px] text-fg">{formatIsoDateDa(contract.renewalAt)}</dd>
              </div>
            : null}
          </dl>

          <div className="rounded-xl border border-border-soft bg-surface-muted/35 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Underskrift</h3>
            {signedLabel ?
              <ul className="mt-2 space-y-1 font-sans text-[12.5px] text-fg-muted">
                <li>
                  <span className="font-medium text-fg">{contract.signedByName ?? contract.signedBy}</span>
                  {contract.signedByTitle ? `, ${contract.signedByTitle}` : ""}
                </li>
                {contract.signedByCompany ? <li>{contract.signedByCompany}</li> : null}
                {contract.signedByEmail ? <li>{contract.signedByEmail}</li> : null}
                <li className="tabular-nums">Underskrevet {signedLabel}</li>
              </ul>
            : <p className="mt-2 font-sans text-[12.5px] text-fg-muted">Ikke underskrevet endnu.</p>}

            {contract.hasDocument || signedLabel ?
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={`/api/contracts/${encodeURIComponent(String(docId))}/document`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[12px] font-medium text-agency-brand hover:underline"
                >
                  Se kontrakt →
                </a>
                <a
                  href={`/api/contracts/${encodeURIComponent(String(docId))}/document?print=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[12px] font-medium text-agency-brand hover:underline"
                >
                  Hent som PDF →
                </a>
              </div>
            : null}
          </div>
        </div>
      : <p className="mt-4 font-sans text-[13px] text-fg-muted">
          {isGroup ?
            "Kontrakter administreres pr. brand — åbn et brand for at se aftalen."
          : "Ingen kontrakt tilknyttet denne kunde endnu."}
        </p>
      }
    </div>
  );
}
