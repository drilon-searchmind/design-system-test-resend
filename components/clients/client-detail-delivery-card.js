import { PulseAllocationBar } from "@/components/pulse/pulse-allocation-bar";
import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { formatPercent } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number] }} props
 */
export function ClientDetailDeliveryCard({ client }) {
  const util =
    client.hoursBudget > 0 ? client.hoursThisMonth / client.hoursBudget : 0;
  const entries = Object.entries(client.allocation ?? {}).filter(([, v]) => v > 0);

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Leverance & udnyttelse
      </h2>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                Udnyttelse denne måned
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold tabular-nums tracking-tight text-fg",
                  util > 1 && "text-agency-bad",
                  util <= 1 && util > 0.9 && "text-agency-warn",
                  util <= 0.9 && "text-agency-ok",
                )}
              >
                {formatPercent(util)}
              </p>
            </div>
            <p className="text-[11px] tabular-nums text-fg-muted">
              {client.hoursThisMonth} / {client.hoursBudget} t
            </p>
          </div>
          <PulseUtilBar hours={client.hoursThisMonth} budget={client.hoursBudget} className="mt-2" />
          {client.utilisationHistory?.length ? (
            <div className="mt-3 text-agency-brand">
              <p className="mb-1 font-sans text-[11px] text-fg-muted">12 md trend</p>
              <PulseSparkline data={client.utilisationHistory} height={36} />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 lg:border-l lg:border-border lg:pl-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Allokering pr. disciplin
          </p>
          <PulseAllocationBar allocation={client.allocation} height={12} className="mt-3" />
          <ul className="mt-4 space-y-2 font-sans text-[12px]">
            {[...entries]
              .sort((a, b) => b[1] - a[1])
              .map(([dept, pct]) => {
                const d = DEPARTMENTS.find((x) => x.id === dept);
                return (
                  <li key={dept} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full ring-1 ring-border/60"
                        style={{ backgroundColor: agencyDeptColor(dept) }}
                      />
                      <span className="truncate text-fg-muted">{d?.name ?? dept}</span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-fg">{pct}%</span>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </div>
  );
}
