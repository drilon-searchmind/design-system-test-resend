import Link from "next/link";

import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{ demand: ReturnType<typeof import('@/lib/crm/workload-utils').workloadTaskDemandByDept> }} props
 */
export function WorkloadDemandCard({ demand }) {
  const maxOpen = Math.max(1, ...demand.map((r) => r.open));

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Efterspørgsel fra board
          </h2>
          <p className="mt-1 max-w-xl font-sans text-[11px] leading-snug text-fg-muted">
            Åbne opgaver pr. disciplin — sammenlign med kapacitet i{" "}
            <Link href={routes.tasks} className="font-medium text-agency-brand hover:underline">
              Opgaver
            </Link>
            .
          </p>
        </div>
        <Link href={routes.tasks} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Åbn opgaveliste →
        </Link>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {demand.map((r) => (
          <li
            key={r.dept.id}
            className={cn(
              "flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-muted/35 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
              r.overdue > 0 && "border-agency-bad-border/35 bg-agency-bad-soft/25",
            )}
          >
            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:w-[140px]">
              <span
                className="size-2.5 shrink-0 rounded-sm ring-1 ring-border/50"
                style={{ backgroundColor: agencyDeptColor(r.dept.id) }}
              />
              <span className="truncate font-sans text-[12px] font-semibold text-fg">{r.dept.name}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-fg-muted">
              <span>
                Åbne: <span className="tabular-nums text-fg">{r.open}</span>
              </span>
              <span>
                Høj prio:{" "}
                <span className={cn("tabular-nums", r.high > 0 ? "text-agency-warn" : "text-fg")}>{r.high}</span>
              </span>
              <span>
                Overskr.:{" "}
                <span className={cn("tabular-nums", r.overdue > 0 ? "text-agency-bad" : "text-fg")}>{r.overdue}</span>
              </span>
            </div>
            <PulseUtilBar hours={r.open} budget={maxOpen} className="w-full shrink-0 sm:max-w-[160px]" />
          </li>
        ))}
      </ul>
    </section>
  );
}
