import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { PulseAllocationBar } from "@/components/pulse/pulse-allocation-bar";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { formatCurrencyCompact, formatHoursBudgetPairDa, formatHoursCompactDa, formatPercent } from "@/lib/crm/format-da";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number]; variant?: 'pulse' | 'full' }} props
 */
export function ClientGridCard({ client, variant = "pulse" }) {
  const owner = TEAM.find((t) => t.id === client.owner);
  const util = client.hoursBudget > 0 ? client.hoursThisMonth / client.hoursBudget : 0;

  return (
    <Link
      href={`${routes.clients}/${client.id}`}
      className={cn(
        "tally-panel flex flex-col p-3.5 transition-all",
        "hover:border-agency-brand-border md:p-4",
      )}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-[13px] font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, oklch(62% 0.15 ${client.hue}), oklch(52% 0.18 ${client.hue + 30}))`,
          }}
        >
          {client.logo}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-[13.5px] font-semibold text-fg">{client.name}</div>
          <div className="truncate font-sans text-[11px] text-fg-quiet">{client.industry}</div>
        </div>
        <HealthChip health={client.health} palette="agency" compact={variant === "full"} />
      </div>

      {variant === "full" ? (
        <div className="mb-2 flex flex-wrap gap-2">
          <StatusChip status={client.status} palette="agency" />
          <span className="text-[10px] tabular-nums text-fg-quiet">{client.lastActivity}</span>
        </div>
      ) : null}

      <div className="mb-2.5 grid grid-cols-2 gap-2.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Retainer
          </div>
          <div className="text-sm font-semibold tabular-nums text-fg">
            {formatCurrencyCompact(client.retainer, client.currency)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Margin
          </div>
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              client.monthlyProfitMargin < 0 ? "text-agency-bad" : "text-agency-ok",
            )}
          >
            {formatPercent(client.monthlyProfitMargin)}
          </div>
        </div>
      </div>

      <div className="flex justify-between font-sans text-[11px] text-fg-muted">
        <span>Timer denne md</span>
        <span
          className={cn(
            "tabular-nums",
            util > 1 ? "text-agency-bad" : "text-fg",
          )}
        >
          {formatHoursBudgetPairDa(client.hoursThisMonth, client.hoursBudget)}
        </span>
      </div>
      <PulseUtilBar hours={client.hoursThisMonth} budget={client.hoursBudget} className="mt-1" />
      {typeof client.estimatedHoursOpen === "number" && client.estimatedHoursOpen > 0 ?
        <p className="mt-1 text-[10px] tabular-nums text-fg-quiet">
          +{formatHoursCompactDa(client.estimatedHoursOpen)}t est. på åbne opgaver
        </p>
      : null}

      <div className="mt-2.5">
        <div className="mb-1 font-sans text-[11px] text-fg-muted">Allokering</div>
        <PulseAllocationBar allocation={client.allocation} height={8} />
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        {owner ? (
          <div className="flex items-center gap-1.5">
            <CrmAvatar label={owner.avatar} src={owner.image} hue={owner.hue} className="size-[18px] text-[9px]" />
            <span className="font-sans text-[11px] text-fg-muted">{owner.name.split(" ")[0]}</span>
          </div>
        ) : (
          <span />
        )}
        {variant === "pulse" ? (
          <span className="text-[10.5px] text-fg-quiet">{client.lastActivity}</span>
        ) : null}
      </div>
    </Link>
  );
}
