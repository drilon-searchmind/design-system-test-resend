import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   snapshots: ReturnType<typeof import('@/lib/crm/team-utils').teamDeptSnapshots>;
 * }} props
 */
export function TeamDeptOverview({ snapshots }) {
  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Discipliner · roster vs. referencetloft
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {snapshots.map((s) => {
          const { dept, headcount, weeklyHours, approxWeeklyDeptCapacity, staffingPct } = s;
          const ratio = approxWeeklyDeptCapacity > 0 ? weeklyHours / approxWeeklyDeptCapacity : 0;

          return (
            <div
              key={dept.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-muted/35 p-3",
                headcount === 0 && "opacity-65",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-semibold text-fg">{dept.name}</p>
                  <p className="text-[10px] tabular-nums text-fg-quiet">
                    {headcount} {headcount === 1 ? "person" : "personer"}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-border-soft px-2 py-0.5 text-[10px] font-bold uppercase text-fg-muted">
                  {dept.short}
                </span>
              </div>
              <CrmHoverPopover
                align="start"
                title={`Bemanding · ${dept.name}`}
                content={
                  <div className="space-y-1.5 text-[12px] leading-snug text-fg-muted">
                    <p>
                      Kontrakteret tid: <span className="font-semibold text-fg">{weeklyHours} t/uge</span>
                    </p>
                    <p>
                      Reference-loft (månedskapacitet ÷ 4,33):{" "}
                      <span className="font-semibold text-fg">{approxWeeklyDeptCapacity} t/uge</span>
                    </p>
                    <p className="border-t border-border-muted pt-1.5">
                      Bemanding = kontrakteret ÷ loft = <span className="font-semibold text-fg">{staffingPct}%</span>
                    </p>
                  </div>
                }
              >
                <span
                  className={cn(
                    "text-[11px] tabular-nums underline decoration-dotted decoration-border underline-offset-2",
                    ratio > 1 ? "font-semibold text-agency-warn" : ratio > 0.92 ? "text-agency-ok" : "text-fg-quiet",
                  )}
                >
                  {staffingPct}% bemandet
                </span>
              </CrmHoverPopover>
              {headcount > 0 ? (
                <PulseUtilBar hours={weeklyHours} budget={approxWeeklyDeptCapacity} />
              ) : (
                <div className="h-1.5 rounded-full bg-surface-muted-strong" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
