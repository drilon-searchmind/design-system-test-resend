import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { formatCurrency, formatCurrencyCompact, formatIsoDateDa } from "@/lib/crm/format-da";
import { UPSELL_TYPES, formatUpsellPeriodDa } from "@/lib/crm/upsell-utils";
import { cn } from "@/lib/utils";

/**
 * Detaljer om opsalg (til hover) — hvem, hvornår, hvilken periode, beløb og beskrivelse.
 * @param {{ items: import("@/lib/crm/upsell-utils").UpsellItem[]; currency?: string; showClient?: boolean }} props
 */
export function UpsellDetails({ items, currency = "DKK", showClient = false }) {
  return (
    <ul className="max-w-xs space-y-2.5 text-[12px] leading-snug text-fg-muted">
      {items.map((u) => (
        <li key={u.id} className="border-b border-border-muted pb-2 last:border-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-fg">{UPSELL_TYPES[u.type]?.label ?? u.type}</span>
            <span className="tabular-nums font-semibold text-fg">
              {formatCurrency(u.amount, u.currency || currency)}
              {u.type === "temporary_mrr" ? " / md" : ""}
            </span>
          </div>
          <div className="mt-0.5 text-fg-quiet">
            {showClient && u.clientName ? `${u.clientName} · ` : ""}
            {formatUpsellPeriodDa(u)} · solgt af {u.soldBy}
            {u.soldAt ? ` · ${formatIsoDateDa(u.soldAt)}` : ""}
          </div>
          {u.description ? <p className="mt-1">{u.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * MRR med opsalg for perioden vist som "20 t kr. (+5 t kr. (i))". Hover på (i) viser præcis hvad
 * der er solgt. Uden opsalg vises kun MRR.
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
  return (
    <span className={cn("tabular-nums", className)}>
      {fmt(client.retainer, currency)}
      {up && up.amount > 0 ?
        <span className="ml-1 text-fg-muted">
          (+{fmt(up.amount, currency)}{" "}
          <CrmHoverPopover
            align="start"
            title="Opsalg i denne periode"
            content={<UpsellDetails items={up.items} currency={currency} />}
            triggerClassName="inline-flex"
          >
            <span
              role="img"
              aria-label="Se opsalg"
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