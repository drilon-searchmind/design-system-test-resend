import Link from "next/link";

import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { PulseIconTrendUp } from "@/components/pulse/pulse-icons";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { routes } from "@/config/routes";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { DEFAULT_AGENCY_SETTINGS } from "@/lib/crm/agency-settings";
import { computeDeptProfitability } from "@/lib/crm/dept-profitability";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { cn } from "@/lib/utils";

export function PulseProfitabilityChart() {
  const { deptPerformance: rows, departments: DEPARTMENTS, team, period, agencySettings } = usePulseData();
  const PROFITABILITY_PER_EMPLOYEE =
    agencySettings?.profitabilityPerEmployee ?? DEFAULT_AGENCY_SETTINGS.profitabilityPerEmployee;

  const computed = rows.map((r) => {
    const employees = team.filter((m) => m.dept === r.dept).length;
    const { target, ratio } = computeDeptProfitability({
      employees,
      soldMrr: r.revenue,
      perEmployee: PROFITABILITY_PER_EMPLOYEE,
    });
    return { ...r, employees, target, ratio };
  });
  const maxBar = Math.max(...computed.map((r) => Math.max(r.revenue, r.target)), 1);
  const overDept = computed.find((r) => r.ratio != null && r.ratio > 1);

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-profit-heading">
      <div id="pulse-profit-heading">
        <PulseCardHeader
          title="Rentabilitet per afdeling"
          sub={`Krav ift. solgt MRR (${period.label.toLowerCase()}). Hold musen over procenten for udregningen.`}
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
                className="grid grid-cols-1 items-center gap-3 border-b border-border-muted pb-3 last:border-0 last:pb-0 sm:[grid-template-columns:minmax(5rem,7rem)_minmax(0,1fr)_4rem]"
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

                <CrmHoverPopover
                  align="start"
                  title={`Sådan beregnes ${d?.name ?? r.dept}`}
                  content={
                    <div className="space-y-1.5 text-[12px] leading-snug text-fg-muted">
                      <p>
                        Krav: {r.employees} medarbejdere ×{" "}
                        {PROFITABILITY_PER_EMPLOYEE.toLocaleString("da-DK")} kr ={" "}
                        <span className="font-semibold text-fg">
                          {Math.round(r.target).toLocaleString("da-DK")} kr
                        </span>
                      </p>
                      <p>
                        Solgt MRR:{" "}
                        <span className="font-semibold text-fg">
                          {Math.round(r.revenue).toLocaleString("da-DK")} kr
                        </span>
                      </p>
                      {r.soldMrrBreakdown ?
                        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-fg-quiet">
                          <li>Afdelingsbudgetter: {r.soldMrrBreakdown.fromBudgets.toLocaleString("da-DK")} kr</li>
                          <li>
                            Retainer × allokering (kunder uden budgetter):{" "}
                            {r.soldMrrBreakdown.fromAllocation.toLocaleString("da-DK")} kr
                          </li>
                          <li>Tillæg i perioden: {r.soldMrrBreakdown.fromUpsells.toLocaleString("da-DK")} kr</li>
                        </ul>
                      : null}
                      <p className="border-t border-border-muted pt-1.5">
                        Rentabilitet = krav ÷ solgt MRR ={" "}
                        <span className="font-semibold text-fg">
                          {r.ratio == null ? "— (ingen solgt MRR)" : formatPercent(r.ratio)}
                        </span>
                      </p>
                    </div>
                  }
                  className="sm:justify-end"
                >
                  <span
                    className={cn(
                      "text-[12px] font-semibold tabular-nums underline decoration-dotted decoration-border underline-offset-2 sm:text-right",
                      r.ratio == null && "text-fg-muted",
                      r.ratio != null && r.ratio > 1 && "text-agency-bad",
                      r.ratio != null && r.ratio > 0.9 && r.ratio <= 1 && "text-agency-warn",
                      r.ratio != null && r.ratio <= 0.9 && "text-agency-ok",
                    )}
                  >
                    {r.ratio == null ? "—" : formatPercent(r.ratio)}
                  </span>
                </CrmHoverPopover>

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
          <span className="h-2.5 w-3 rounded-sm bg-agency-brand" /> Krav (medarbejdere)
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
