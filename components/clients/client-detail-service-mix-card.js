import Link from "next/link";

import { routes } from "@/config/routes";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { formatPercent } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number] }} props
 */
export function ClientDetailServiceMixCard({ client }) {
  const active = client.servicesActive ?? [];
  const alloc = client.allocation ?? {};

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Aktive services & kapacitetsfordeling
        </h2>
        <Link href={routes.tasks} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Opgaver — hel workspace →
        </Link>
      </div>

      <p className="mt-2 max-w-xl font-sans text-[11px] leading-snug text-fg-muted">
        Andel ud af aftalt timebudget fordelt ud fra allokerings-matrixen på kunden ({client.hoursBudget} t/md).
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
              <th className="py-2 pr-3 font-medium">Disciplin</th>
              <th className="py-2 pr-3 font-medium">Kontraktuelt aktiv</th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell">
                Tid / md (~)
              </th>
              <th className="py-2 font-medium">Andel</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((d) => {
              const pct = alloc[d.id];
              const isActive = active.includes(d.id);
              const hoursApprox =
                pct != null && pct > 0 ? ((client.hoursBudget * pct) / 100).toFixed(1) : null;
              return (
                <tr
                  key={d.id}
                  className={cn(
                    "border-b border-border-soft last:border-0",
                    isActive ? "opacity-100" : "opacity-55",
                  )}
                >
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 font-sans text-[13px] text-fg">
                      <span
                        className="size-2.5 shrink-0 rounded-sm ring-1 ring-border/50"
                        style={{ backgroundColor: agencyDeptColor(d.id) }}
                      />
                      {d.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-fg-muted">{d.short}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        isActive
                          ? "border-agency-ok-border bg-agency-ok-soft text-agency-ok"
                          : "border-border bg-surface-muted text-fg-quiet",
                      )}
                    >
                      {isActive ? "Ja" : "Nej"}
                    </span>
                  </td>
                  <td className="hidden py-2.5 pr-3 tabular-nums text-fg-muted sm:table-cell">
                    {hoursApprox != null ? `${hoursApprox} t` : "—"}
                  </td>
                  <td className="py-2.5 tabular-nums text-fg">
                    {pct != null ? formatPercent((pct ?? 0) / 100) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
