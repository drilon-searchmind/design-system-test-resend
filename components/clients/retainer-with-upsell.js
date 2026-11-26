"use client";

import { useSession } from "next-auth/react";

import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { formatCurrency, formatCurrencyCompact, formatIsoDateDa } from "@/lib/crm/format-da";
import {
  UPSELL_TYPES,
  formatUpsellPeriodDa,
  isDownsellType,
  isTemporaryUpsellType,
  upsellSignedAmount,
} from "@/lib/crm/upsell-utils";
import { cn } from "@/lib/utils";

/**
 * Detaljer om opsalg/nedsalg (til hover). Sælger vises kun for admins.
 * @param {{ items: import("@/lib/crm/upsell-utils").UpsellItem[]; currency?: string; showClient?: boolean }} props
 */
export function UpsellDetails({ items, currency = "DKK", showClient = false }) {
  const { data: session } = useSession();
  const showSeller = session?.user?.isAdmin === true;
  return (
    <ul className="max-w-xs space-y-2.5 text-[12px] leading-snug text-fg-muted">
      {items.map((u) => {
        const signed = upsellSignedAmount(u);
        return (
          <li key={u.id} className="border-b border-border-muted pb-2 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-fg">{UPSELL_TYPES[u.type]?.label ?? u.type}</span>
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  signed < 0 ? "text-agency-bad" : "text-fg",
                )}
              >
                {signed < 0 ? "−" : ""}
                {formatCurrency(Math.abs(signed), u.currency || currency)}
                {isTemporaryUpsellType(u.type) ? " / md" : ""}
              </span>
            </div>
            <div className="mt-0.5 text-fg-quiet">
              {showClient && u.clientName ? `${u.clientName} · ` : ""}
              {formatUpsellPeriodDa(u)}
              {showSeller && u.soldBy ?
                ` · ${isDownsellType(u.type) ? "registreret af" : "solgt af"} ${u.soldBy}`
              : ""}
              {u.soldAt ? ` · ${formatIsoDateDa(u.soldAt)}` : ""}
            </div>
            {u.description ? <p className="mt-1">{u.description}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * MRR med opsalg/nedsalg for perioden vist som "20 t kr. (+5 t kr. (i))".
 *
 * @param {{
 *   client: { retainer: number; currency?: string; upsellMonth?: { amount: number; items: import("@/lib/crm/upsell-utils").UpsellItem[] } };
 *   className?: string;
 *   full?: boolean;
 * }} props `full` = fulde beløb i stedet for kompakt
 */
export function RetainerWithUpsell({ client, className, full = false }) {
  const fmt = full ? formatCurrency : formatCurrencyCompact;
  const currency = client.currency ?? "DKK";
  const up = client.upsellMonth;
  const delta = up ? Number(up.amount) || 0 : 0;
  return (
    <span className={cn("tabular-nums", className)}>
      {fmt(client.retainer, currency)}
      {up && delta !== 0 ?
        <span className={cn("ml-1", delta < 0 ? "text-agency-bad" : "text-fg-muted")}>
          ({delta < 0 ? "−" : "+"}
          {fmt(Math.abs(delta), currency)}{" "}
          <CrmHoverPopover
            align="start"
            title={delta < 0 ? "Nedsalg i denne periode" : "Opsalg i denne periode"}
            content={<UpsellDetails items={up.items} currency={currency} />}
            triggerClassName="inline-flex"
          >
            <span
              role="img"
              aria-label={delta < 0 ? "Se nedsalg" : "Se opsalg"}
              className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border border-border text-[9px] font-semibold not-italic leading-none text-fg-soft"
            >
              i
            </span>
          </CrmHoverPopover>
          )
        </span>
      : null}
    </span>
  );
}
