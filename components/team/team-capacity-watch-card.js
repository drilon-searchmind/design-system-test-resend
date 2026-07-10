import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { memberProfileHref, routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   teamRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 * }} props
 */
export function TeamCapacityWatchCard({ teamRows }) {
  const hot = [...teamRows].sort((a, b) => b.loadIndex - a.loadIndex).slice(0, 6);

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Belægningswatch (fra board)
        </h2>
        <p className="max-w-md font-sans text-[11px] text-fg-muted">
          Samme index som Belægning — profiler med højest belægning.
        </p>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-border-soft">
        {hot.map((r) => (
          <li key={r.member.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <CrmAvatar
              label={r.member.avatar}
              src={r.member.image}
              hue={r.member.hue}
              className="size-8 text-[11px]"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={memberProfileHref(r.member)}
                className={cn(
                  "font-sans text-[13px] font-semibold text-fg hover:text-agency-brand",
                  r.member.isMe && "text-agency-brand",
                )}
              >
                {r.member.name}
              </Link>
              <p className="font-sans text-[11px] text-fg-muted">{r.member.role}</p>
            </div>
            <div className="text-[11px] tabular-nums text-fg-muted">
              <span className={cn(r.loadIndex >= 88 ? "font-semibold text-agency-warn" : "text-fg")}>{r.loadIndex}%</span>
              {" · "}
              {r.openCount} åbne
              {r.overdueCount > 0 ? <span className="text-agency-bad"> · {r.overdueCount} økr.</span> : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border-soft pt-3 font-sans text-[11px] text-fg-muted">
        <Link href={routes.workload} className="font-medium text-agency-brand hover:underline">
          Åbn fuld workload-matrix →
        </Link>
      </p>
    </section>
  );
}
