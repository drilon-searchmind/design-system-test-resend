import Link from "next/link";

import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { routes } from "@/config/routes";
import { CONTRACT_DEMO_REF_DATE, contractDaysUntilRenewal } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact, formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{ row: {
 *   id: string;
 *   clientId: string;
 *   clientName: string;
 *   clientLogo: string;
 *   clientHue: number;
 *   kind: string;
 *   monthlyValue: number;
 *   currency: string;
 *   startedAt: string;
 *   renewalAt: string;
 *   accountStatus: 'active' | 'paused' | 'inactive';
 *   health: 'ok' | 'warn' | 'bad';
 *   noticeDays: number;
 * }; renewalReferenceIso?: string }} props
 */
export function ContractGridCard({ row, renewalReferenceIso = CONTRACT_DEMO_REF_DATE }) {
  const days = contractDaysUntilRenewal(row.renewalAt, renewalReferenceIso);

  return (
    <Link
      href={`${routes.contracts}/${row.id}`}
      className={cn(
        "tally-panel flex flex-col p-3.5 transition-all",
        "hover:border-agency-brand-border md:p-4",
      )}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-[13px] font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, oklch(62% 0.15 ${row.clientHue}), oklch(52% 0.18 ${row.clientHue + 28}))`,
          }}
        >
          {row.clientLogo}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-[13.5px] font-semibold text-fg">{row.clientName}</div>
          <div className="truncate text-[11px] text-fg-quiet">{row.kind}</div>
        </div>
        <HealthChip health={row.health} palette="agency" compact />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusChip status={row.accountStatus} palette="agency" />
        <span className="text-[10px] tabular-nums text-fg-muted">
          Opsigelse {row.noticeDays} d
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Beløb / md
          </div>
          <div className="text-sm font-semibold tabular-nums text-fg">
            {formatCurrencyCompact(row.monthlyValue, row.currency)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Fornyelse
          </div>
          <div className="text-[12px] tabular-nums text-fg">{formatIsoDateDa(row.renewalAt)}</div>
          {row.accountStatus === "active" ? (
            <div
              className={cn(
                "mt-0.5 text-[10px] tabular-nums",
                days < 0 && "text-agency-bad",
                days >= 0 && days <= 30 && "text-agency-warn",
                days > 30 && "text-fg-quiet",
              )}
            >
              {days < 0 ? `${Math.abs(days)} d overskredet` : days === 0 ? "I dag" : `Om ${days} d`}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-fg-quiet">
        Start {formatIsoDateDa(row.startedAt)}
      </p>
    </Link>
  );
}
