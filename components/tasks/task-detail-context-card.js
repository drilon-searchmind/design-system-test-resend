import Link from "next/link";

import { routes } from "@/config/routes";
import { formatCurrencyCompact } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   client: { id: string; name: string; industry?: string };
 *   contract: {
 *     id: string;
 *     clientId: string;
 *     clientName: string;
 *     clientLogo: string;
 *     clientHue: number;
 *     kind: string;
 *     monthlyValue: number;
 *     currency: string;
 *   } | null;
 * }} props
 */
export function TaskDetailContextCard({ client, contract }) {
  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kunde & aftale</h2>

      <div className="mt-5 flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-quiet">Kunde</p>
          <Link
            href={`${routes.clients}/${client.id}`}
            className="mt-1 inline-flex font-sans text-[14px] font-semibold text-fg underline-offset-4 hover:text-agency-brand hover:underline"
          >
            {client.name}
          </Link>
          {client.industry ? <p className="mt-0.5 font-sans text-[12px] text-fg-muted">{client.industry}</p> : null}
        </div>

        <div className={cn("border-t border-border-soft pt-5")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-quiet">Primær aftale</p>
            {contract ?
              <Link
                href={`${routes.contracts}/${contract.id}`}
                className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
              >
                Åbn kontrakt →
              </Link>
            : null}
          </div>
          {contract ?
            <div className="mt-3 flex items-start gap-3">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border",
                  "text-xs font-semibold text-white",
                )}
                style={{
                  background: `linear-gradient(135deg, oklch(62% 0.15 ${contract.clientHue}), oklch(52% 0.18 ${contract.clientHue + 28}))`,
                }}
              >
                {contract.clientLogo}
              </span>
              <div className="min-w-0">
                <Link
                  href={`${routes.contracts}/${contract.id}`}
                  className="font-sans text-[14px] font-semibold leading-snug text-fg underline-offset-4 hover:text-agency-brand hover:underline"
                >
                  {contract.clientName}
                </Link>
                <p className="mt-1 text-[11px] text-fg-muted">
                  {contract.kind}
                  {" · "}
                  <span className="tabular-nums">{formatCurrencyCompact(contract.monthlyValue, contract.currency)}/md</span>
                </p>
                <p className="mt-1 text-[10px] text-fg-quiet">{contract.id}</p>
              </div>
            </div>
          : <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-4 font-sans text-[13px] text-fg-muted">
              Ingen primær aftale udtrukket for denne kunde — aktiver først aktiv notice/active kontrakt.
            </p>}
        </div>
      </div>
    </div>
  );
}
