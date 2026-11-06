import Link from "next/link";

import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { PulseIconTrendUp } from "@/components/pulse/pulse-icons";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import {
  PROFITABILITY_PER_EMPLOYEE,
  computeDeptProfitability,
} from "@/lib/crm/dept-profitability";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { cn } from "@/lib/utils";

export function PulseProfitabilityChart() {
  const { deptPerformance: rows, departments: DEPARTMENTS, team, period } = usePulseData();

  const computed = rows.map((r) => {
    const employees = team.filter((m) => m.dept === r.dept).length;
    const { target, ratio } = computeDeptProfitability({ employees, soldMrr: r.revenue });
    return { ...r, employees, target, ratio };
  });
  const maxBar = Math.max(...computed.map((r) => Math.max(r.revenue, r.target)), 1);
  const overDept = computed.find((r) => r.ratio != null && r.ratio > 1);

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-profit-heading">
      <div id="pulse-profit-heading">
        <PulseCardHeader
          title="Rentabilitet per afdeling"
          sub={`Medarbejdere × ${PROFITABILITY_PER_EMPLOYEE.toLocaleString("da-DK")} kr ÷ solgt MRR (${period.label.toLowerCase()})`}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[min(100%,680px)] space-y-2 md:min-w-0">
          {computed.map((r) => {
            const d = DEPARTMENTS.find((x) => x.id === r.dept);
            const deptColor = agencyDeptColor(r.dept);
            const mrrPct = (r.revenue / maxBar) * 100;
            const targetPct = (r.target / maxBar) * 100;

            return (
              <div
                key={r.dept}
                className="grid grid-cols-1 items-center gap-3 border-b border-border-muted pb-3 last:border-0 last:pb-0 sm:[grid-template-columns:minmax(5rem,7rem)_minmax(0,1fr)_7rem_4rem]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm ring-1 ring-border"
                    style={{ backgroundColor: deptColor }}
                  />
                  <span className="font-sans text-[12.5px] font-medium text-fg">{d?.name ?? r.dept}</span>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative h-[22px] min-w-0 flex-1 overflow-hidden rounded-md bg-surface-muted-strong ring-1 ring-border/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{ width: `${mrrPct}%`, backgroundColor: deptColor, opacity: 0.22 }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
                      style={{ width: `${Math.min(targetPct, 100)}%`, backgroundColor: deptColor }}
                    />
                  </div>
                  <span className="w-[4.25rem] shrink-0 text-right font-sans text-[11.5px] font-semibold tabular-nums text-fg">
                    {formatCurrencyCompact(r.revenue)}
                  </span>
                </div>

                <span className="text-[12px] tabular-nums text-fg-muted sm:text-right">
                  {r.employees} × {formatCurrencyCompact(PROFITABILITY_PER_EMPLOYEE)} ={" "}
                  {formatCurrencyCompact(r.target)}
                </span>

                <span
                  className={cn(
                    "text-[12px] font-semibold tabular-nums sm:text-right",
                    r.ratio == null && "text-fg-muted",
                    r.ratio != null && r.ratio > 1 && "text-agency-bad",
                    r.ratio != null && r.ratio > 0.9 && r.ratio <= 1 && "text-agency-warn",
                    r.ratio != null && r.ratio <= 0.9 && "text-agency-ok",
                  )}
                >
                  {r.ratio == null ? "—" : formatPercent(r.ratio)}
                </span>

                <div className="sm:hidden">
                  <PulseUtilBar hours={r.target} budget={Math.max(r.revenue, 1)} />
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
          Solgt MRR
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-3 rounded-sm bg-agency-brand" /> Medarbejdere × {PROFITABILITY_PER_EMPLOYEE.toLocaleString("da-DK")} kr
        </span>
        <span className="inline-flex items-center gap-2 md:ml-auto">
          <PulseIconTrendUp className="text-agency-ok" size={12} />
          <span className="text-fg-muted">
            {overDept ? (
              <>
                {DEPARTMENTS.find((x) => x.id === overDept.dept)?.name ?? overDept.dept} ligger på{" "}
                {formatPercent(overDept.ratio ?? 0)} —{" "}
              </>
            ) : (
              <>Alle afdelinger er dækket af solgt MRR — </>
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
