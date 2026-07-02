import Link from "next/link";

import { routes, workloadMemberHref } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   deptRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildDeptWorkloadRows>;
 *   teamRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 *   budgetAlerts?: typeof SMART_ALERTS;
 * }} props
 */
export function WorkloadInsightsCard({ deptRows, teamRows, budgetAlerts = [] }) {
  const budgetAlertsResolved = budgetAlerts.filter((a) => a.type === "overBudget");
  const hotDepts = deptRows.filter((r) => r.tone === "burn" || r.tone === "sell");
  const hotPeople = teamRows.filter((r) => r.loadIndex >= 82).slice(0, 4);

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Indsigter & eskalationer
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href={routes.pulse} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
            Pulse
          </Link>
          <span className="text-fg-quiet">·</span>
          <Link href={routes.time} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
            Tid
          </Link>
        </div>
      </div>

      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Triage ud fra disciplin-toner og team-liste{budgetAlerts.length ? " — Pulse budget-alerts når der er signaler." : "."}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {hotDepts.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-4 text-[12px] text-fg-muted">
            Ingen discipliner markeret som over-allokeret eller overforbrug lige nu — hold øje med PPC når
            kunder eskalerer.
          </li>
        ) : (
          hotDepts.map((r) => (
            <li key={r.dept.id} className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-3">
              <p className="font-sans text-[12px] font-semibold text-fg">{r.dept.name}</p>
              <p className="mt-1 text-[11px] text-fg-muted">
                {r.tone === "burn"
                  ? `Forbrug ${r.tracked} t ligger over tildelt ${r.assigned} t — afstem budget eller scope.`
                  : `Tildelt ${r.assigned} t vs. kapacitet ${r.capacity} t — kapacitetsplan eller salg skal justeres.`}
              </p>
            </li>
          ))
        )}

        {hotPeople.length > 0 ? (
          <li className="rounded-xl border border-agency-warn-border/40 bg-agency-warn-soft/20 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Høj belægning</p>
            <ul className="mt-2 space-y-1.5 font-sans text-[12px] text-fg-muted">
              {hotPeople.map((r) => (
                <li key={r.member.id}>
                  <Link href={workloadMemberHref(r.member.id)} className="font-semibold text-fg hover:text-agency-brand">
                    {r.member.name}
                  </Link>
                  {" — "}
                  belægning <span className="tabular-nums text-agency-warn">{r.loadIndex}%</span>
                  {" · "}
                  {r.openCount} åbne
                  {r.overdueCount > 0 ? (
                    <span className="text-agency-bad">
                      {" "}
                      · {r.overdueCount} overskr.
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ) : null}

        {budgetAlertsResolved.length > 0 ? (
          <li className="rounded-xl border border-border-soft bg-surface-muted/30 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
              Budget-alerts (Pulse)
            </p>
            <ul className="mt-2 space-y-2">
              {budgetAlertsResolved.slice(0, 3).map((a) => (
                <li key={a.id} className="font-sans text-[12px] leading-snug text-fg-muted">
                  <span className={cn("font-semibold", a.severity === "bad" ? "text-agency-bad" : "text-agency-warn")}>
                    {a.title}
                  </span>
                  <span className="block text-[11px] text-fg-quiet">{a.body}</span>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
