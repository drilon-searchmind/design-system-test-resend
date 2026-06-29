import { StatusChip } from "@/components/crm/status-chip";
import { formatCurrency } from "@/lib/crm/format-da";

function billingCadence(kind) {
  if (kind === "Projekt") return "Miljøbaseret · afstemmes pr. sprint";
  return "Fast månedlig fakturering ved periodestart";
}

/**
 * @param {{ contract: import('@/lib/crm/static-data').CONTRACTS[number] }} props
 */
export function ContractDetailTermsCard({ contract }) {
  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Vilkår & fakturagrundlag
      </h2>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <dl className="grid gap-x-8 gap-y-4 text-[11px] text-fg-muted sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-fg-soft">Kontrakt-id</dt>
            <dd className="mt-1 text-[13px] text-fg">{contract.id}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Aftaletype</dt>
            <dd className="mt-1 font-sans text-[13px] text-fg">{contract.kind}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Kontostatus under kontrakt</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              <StatusChip status={contract.accountStatus} palette="agency" />
            </dd>
          </div>
          <div>
            <dt className="text-fg-soft">Gyldighed — start</dt>
            <dd className="mt-1 tabular-nums text-fg">{contract.startedAt}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Gyldighed — fornyelse</dt>
            <dd className="mt-1 tabular-nums text-fg">{contract.renewalAt}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Kontraktøkonomi (md)</dt>
            <dd className="mt-1 tabular-nums text-fg">{formatCurrency(contract.monthlyValue, contract.currency)}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Varsel opsigelse</dt>
            <dd className="mt-1 tabular-nums text-fg">{contract.noticeDays} kalenderdage</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-fg-soft">Faktureringsrytme</dt>
            <dd className="mt-1 font-sans text-[13px] leading-snug text-fg-muted">{billingCadence(contract.kind)}</dd>
          </div>
          {contract.signedBy ? (
            <div>
              <dt className="text-fg-soft">Underskrevet af (kunde)</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">{contract.signedBy}</dd>
            </div>
          ) : null}
          {contract.documentUrl ? (
            <div>
              <dt className="text-fg-soft">Kontraktdokument</dt>
              <dd className="mt-1">
                <a
                  href={contract.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[13px] font-medium text-agency-brand hover:underline"
                >
                  Se kontrakt
                </a>
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-surface-muted/30 p-3 font-sans text-[12px] leading-relaxed text-fg-muted">
            <span className="font-medium text-fg-soft">SLO & eskalering:</span> SLA efter aftale med kundeansvarlig;
            ændringsanmodninger logges i revisionsspor nedenfor — fuld PDF-arkiv kommer med Contract-dokument-store.
          </div>
        </dl>

        <div className="rounded-xl border border-border-soft bg-surface-muted/35 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Dækningsnote
          </h3>
          <ul className="mt-3 list-inside list-disc space-y-2 font-sans text-[12px] leading-relaxed text-fg-muted">
            <li>Inkluderet: strategisk sparring, månedlig rapport-rytme, slack-kanal med tildelt AM.</li>
            <li>Ikke inkluderet: medie-forbrug uden for godkendte caps, tredjepartslicenser, rejser.</li>
            <li>Overtid faktureres efter gældende bureau-sats når kunden godkender på forhånd.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
