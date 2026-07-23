import { StatusChip } from "@/components/crm/status-chip";
import { formatCurrency } from "@/lib/crm/format-da";

function billingCadence(kind) {
  if (kind === "Projekt") return "Miljøbaseret · afstemmes pr. sprint";
  return "Fast månedlig fakturering ved periodestart";
}

/**
 * @param {unknown} iso
 */
function formatSignedAt(iso) {
  if (!iso) return "—";
  const s = String(iso);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 19).replace("T", " ");
  return d.toLocaleString("da-DK", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }) + " UTC";
}

/**
 * @param {{ contract: import('@/lib/crm/static-data').CONTRACTS[number] & Record<string, unknown> }} props
 */
export function ContractDetailTermsCard({ contract }) {
  const signingState = typeof contract.signingState === "string" ? contract.signingState : "";
  const isSigned = signingState === "signed" || Boolean(contract.signedAt);
  const isPending = signingState === "pending" || contract.accountStatus === "pending_signature";

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Vilkår & fakturagrundlag
        </h2>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <dl className="grid gap-x-8 gap-y-4 text-[11px] text-fg-muted sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-fg-soft">Kontrakt-id</dt>
              <dd className="mt-1 font-mono text-[13px] text-fg">{contract.id}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">Aftaletype</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">{contract.kind}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">Version</dt>
              <dd className="mt-1 tabular-nums text-fg">
                {typeof contract.version === "number" ? `v${contract.version}` : "v1"}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Status</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                <StatusChip status={contract.accountStatus} palette="agency" />
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Gyldighed — start</dt>
              <dd className="mt-1 tabular-nums text-fg">{contract.startedAt || "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">Gyldighed — fornyelse</dt>
              <dd className="mt-1 tabular-nums text-fg">{contract.renewalAt || "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">Kontraktøkonomi (md)</dt>
              <dd className="mt-1 tabular-nums text-fg">
                {formatCurrency(contract.monthlyValue, contract.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Varsel opsigelse</dt>
              <dd className="mt-1 tabular-nums text-fg">{contract.noticeDays} kalenderdage</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-soft">Faktureringsrytme</dt>
              <dd className="mt-1 font-sans text-[13px] leading-snug text-fg-muted">
                {billingCadence(contract.kind)}
              </dd>
            </div>
            {contract.documentUrl ?
              <div className="sm:col-span-2">
                <dt className="text-fg-soft">Eksternt dokument</dt>
                <dd className="mt-1">
                  <a
                    href={String(contract.documentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[13px] font-medium text-agency-brand hover:underline"
                  >
                    Åbn dokument
                  </a>
                </dd>
              </div>
            : null}
          </dl>

          <div className="rounded-xl border border-border-soft bg-surface-muted/35 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Dækningsnote
            </h3>
            <ul className="mt-3 list-inside list-disc space-y-2 font-sans text-[12px] leading-relaxed text-fg-muted">
              <li>Inkluderet: strategisk sparring, månedlig rapport-rytme, kanal med tildelt AM.</li>
              <li>Ikke inkluderet: medie-forbrug uden for godkendte caps, tredjepartslicenser, rejser.</li>
              <li>Overtid faktureres efter gældende bureau-sats når kunden godkender på forhånd.</li>
            </ul>
          </div>
        </div>

        {typeof contract.documentBodyMd === "string" && contract.documentBodyMd.trim() ?
          <div className="mt-6">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Kontrakttekst
            </h3>
            <pre className="mt-3 max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-muted/40 p-4 font-sans text-[12px] leading-relaxed text-fg">
              {contract.documentBodyMd}
            </pre>
          </div>
        : null}
      </div>

      <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Elektronisk underskrift (bevis)
        </h2>
        <p className="mt-1 font-sans text-[12px] text-fg-muted">
          Simpel elektronisk underskrift (eIDAS SES) — navn, e-mail, tidspunkt, IP og dokument-hash.
        </p>

        {isPending ?
          <p className="mt-4 rounded-xl border border-agency-brand-border bg-agency-brand-soft/50 px-4 py-3 font-sans text-[13px] text-agency-brand">
            Afventer kundens underskrift. Send eller gensend linket fra handlingerne øverst.
          </p>
        : null}

        {!isSigned && !isPending ?
          <p className="mt-4 font-sans text-[13px] text-fg-muted">
            Ingen underskrift registreret endnu.
          </p>
        : null}

        {isSigned ?
          <dl className="mt-5 grid gap-x-8 gap-y-4 text-[11px] text-fg-muted sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-fg-soft">Underskrevet af</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">{String(contract.signedBy ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-fg-soft">E-mail</dt>
              <dd className="mt-1 break-all font-sans text-[13px] text-fg">
                {String(contract.signedByEmail ?? "—")}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Titel / rolle</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">
                {String(contract.signedByTitle ?? "—")}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Virksomhed</dt>
              <dd className="mt-1 font-sans text-[13px] text-fg">
                {String(contract.signedByCompany ?? "—")}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Tidspunkt</dt>
              <dd className="mt-1 tabular-nums text-[13px] text-fg">
                {formatSignedAt(contract.signedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">Samtykke accepteret</dt>
              <dd className="mt-1 tabular-nums text-[13px] text-fg">
                {formatSignedAt(contract.consentAcceptedAt ?? contract.signedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-fg-soft">IP-adresse</dt>
              <dd className="mt-1 font-mono text-[13px] text-fg">
                {String(contract.signatureIp ?? "—")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-soft">User-agent</dt>
              <dd className="mt-1 break-all font-mono text-[11px] leading-snug text-fg">
                {String(contract.signatureUserAgent ?? "—")}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-fg-soft">Dokument-hash (SHA-256)</dt>
              <dd className="mt-1 break-all font-mono text-[11px] leading-snug text-fg">
                {String(contract.signatureDocumentHash ?? "—")}
              </dd>
            </div>
          </dl>
        : null}
      </div>
    </div>
  );
}
