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
        <p className="font-sans text-[11px] text-fg-muted">
          Σ kontrakteret uge / (månedskap. ÷ 4,33) — til capacity‑dialog.
        </p>
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
              <div className="text-[11px] tabular-nums text-fg-muted">
                Σ <span className="text-fg">{weeklyHours}</span>{" "}
                <span className="text-fg-quiet">/</span>{" "}
                <span>{approxWeeklyDeptCapacity}</span>
                {" h/uge "}·{" "}
                <span
                  className={cn(
                    ratio > 1 ? "font-semibold text-agency-warn" : ratio > 0.92 ? "text-agency-ok" : "text-fg-quiet",
                  )}
                >
                  {staffingPct}%
                </span>
              </div>
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
