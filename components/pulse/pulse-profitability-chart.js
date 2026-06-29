import Link from "next/link";

import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { PulseIconTrendUp } from "@/components/pulse/pulse-icons";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { cn } from "@/lib/utils";

export function PulseProfitabilityChart() {
  const { deptPerformance: rows, departments: DEPARTMENTS, period } = usePulseData();
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);
  const overBudgetDept = rows.find((r) => r.util > 1);

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-profit-heading">
      <div id="pulse-profit-heading">
        <PulseCardHeader
          title="Rentabilitet per afdeling"
          sub={`Faktureret retainer-værdi vs. leverede timer (${period.label.toLowerCase()})`}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[min(100%,680px)] space-y-2 md:min-w-0">
          {rows.map((r) => {
            const d = DEPARTMENTS.find((x) => x.id === r.dept);
            const deptColor = agencyDeptColor(r.dept);
            const revPct = (r.revenue / maxRev) * 100;
            const utilRatio = r.budget > 0 ? r.hours / r.budget : 0;
            const innerPct = Math.min(revPct * utilRatio, 100);

            return (
              <div
                key={r.dept}
                className="grid grid-cols-1 items-center gap-3 border-b border-border-muted pb-3 last:border-0 last:pb-0 sm:[grid-template-columns:minmax(5rem,7rem)_minmax(0,1fr)_5.5rem_6rem_4rem]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm ring-1 ring-border"
                    style={{ backgroundColor: deptColor }}
                  />
                  <span className="font-sans text-[12.5px] font-medium text-fg">{d?.name ?? r.dept}</span>
                </div>

                <div className="relative h-[22px] overflow-hidden rounded-md bg-surface-muted-strong ring-1 ring-border/40">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{
                      width: `${revPct}%`,
                      backgroundColor: deptColor,
                      opacity: 0.22,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
                    style={{
                      width: `${innerPct}%`,
                      backgroundColor: deptColor,
                      maxWidth: "100%",
                    }}
                  />
                  <span className="pointer-events-none absolute left-2 top-1/2 max-w-[85%] -translate-y-1/2 truncate text-[11.5px] font-medium tabular-nums text-fg mix-blend-difference">
                    {formatCurrencyCompact(r.revenue)}
                  </span>
                </div>

                <span className="text-[12px] tabular-nums text-fg-muted sm:text-right">
                  {r.hours}/{r.budget} t
                </span>

                <div className="hidden sm:block">
                  <PulseUtilBar hours={r.hours} budget={r.budget} />
                </div>

                <span
                  className={cn(
                    "text-[12px] font-semibold tabular-nums sm:text-right",
                    r.util > 1 && "text-agency-bad",
                    r.util > 0.95 && r.util <= 1 && "text-agency-warn",
                    r.util <= 0.95 && "text-agency-ok",
                  )}
                >
                  {formatPercent(r.util)}
                </span>

                <div className="sm:hidden">
                  <PulseUtilBar hours={r.hours} budget={r.budget} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-[11.5px] text-fg-muted md:flex-row md:flex-wrap md:items-center md:gap-5">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-3 rounded-sm opacity-40"
            style={{ backgroundColor: "var(--agency-brand)" }}
          />{" "}
          Revenue (retainer-værdi)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-3 rounded-sm bg-agency-brand" /> Faktisk leveret tid
        </span>
        <span className="inline-flex items-center gap-2 md:ml-auto">
          <PulseIconTrendUp className="text-agency-ok" size={12} />
          <span className="text-fg-muted">
            {overBudgetDept ? (
              <>
                {DEPARTMENTS.find((x) => x.id === overBudgetDept.dept)?.name ?? overBudgetDept.dept}{" "}
                er {formatPercent(overBudgetDept.util - 1)} over budget —{" "}
              </>
            ) : (
              <>Alle afdelinger inden for budget — </>
            )}
            <Link href={routes.clients} className="text-agency-brand hover:underline">
              se kunder
            </Link>
          </span>
        </span>
      </div>
    </section>
  );
}
