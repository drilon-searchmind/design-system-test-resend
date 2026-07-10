"use client";

import Link from "next/link";

import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { formatCurrencyCompact, formatPercent } from "@/lib/crm/format-da";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

const TONE_LABEL = {
  ok: { label: "Balanceret", className: "border-agency-ok-border bg-agency-ok-soft text-agency-ok" },
  burn: { label: "Overforbrug", className: "border-agency-bad-border bg-agency-bad-soft text-agency-bad" },
  sell: { label: "Over-allokeret", className: "border-agency-warn-border bg-agency-warn-soft text-agency-warn" },
  tight: { label: "Stram kap.", className: "border-agency-warn-border/80 bg-surface-muted text-agency-warn" },
};

const deptMatrixHeaderHintClass =
  "font-[inherit] text-[inherit] underline decoration-dotted decoration-border/80 underline-offset-2 hover:text-fg";

/**
 * @param {{
 *   label: import('react').ReactNode;
 *   title: string;
 *   content?: import('react').ReactNode;
 *   children?: import('react').ReactNode;
 *   align?: "start" | "center";
 *   className?: string;
 * }} props
 */
function DeptMatrixHeaderHint({ label, title, content, children, align = "start", className }) {
  return (
    <CrmHoverPopover
      align={align}
      title={title}
      content={
        content ?? (
          <p className="font-sans text-[12px] leading-snug text-fg-muted">{children}</p>
        )
      }
      triggerClassName={cn(deptMatrixHeaderHintClass, className)}
    >
      {label}
    </CrmHoverPopover>
  );
}

const STATUS_HINT = (
  <div className="space-y-2 font-sans text-[12px] leading-snug text-fg-muted">
    <p>Automatisk tone ud fra forbrug, tildeling og kapacitet i perioden:</p>
    <ul className="list-inside list-disc space-y-1 text-[11px]">
      <li>
        <span className="text-fg">Balanceret</span> — forbrug og tildeling inden for normale grænser
      </li>
      <li>
        <span className="text-fg">Overforbrug</span> — rapporteret forbrug overstiger tildelte timer
      </li>
      <li>
        <span className="text-fg">Over-allokeret</span> — tildelte timer nær eller over kapacitetsloft
      </li>
      <li>
        <span className="text-fg">Stram kap.</span> — høj udnyttelse uden akut over-allokering
      </li>
    </ul>
  </div>
);

/**
 * @param {{ rows: ReturnType<typeof import('@/lib/crm/workload-utils').buildDeptWorkloadRows> }} props
 */
export function WorkloadDeptMatrix({ rows }) {
  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 md:flex-row md:items-start md:justify-between md:py-4">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Disciplin-matrix
          </h2>
          <p className="mt-1 max-w-2xl font-sans text-[11px] leading-snug text-fg-muted">
            Rækker aggregeret fra aktive kunders timebudget og allokeringsmatrix. Søjler til højre viser forbrug mod
            tildelt og tildeling mod månedligt loft.
          </p>
        </div>
        <Link href={routes.pulse} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Agency Pulse →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-border bg-surface-muted/80 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
              <th className="py-3 pl-4 pr-2 font-medium">
                <DeptMatrixHeaderHint label="Disciplin" title="Disciplin">
                  Bureau-disciplin (SEO, Paid, osv.) — én række pr. afdeling i rapportmåneden.
                </DeptMatrixHeaderHint>
              </th>
              <th className="py-3 pr-2 font-medium">
                <DeptMatrixHeaderHint label="Kap." title="Kapacitet">
                  Månedligt kapacitetsloft for disciplinen i timer — baseret på team og kontrakter.
                </DeptMatrixHeaderHint>
              </th>
              <th className="py-3 pr-2 font-medium">
                <DeptMatrixHeaderHint label="Tild." title="Tildelt">
                  Kontrakttimer tildelt disciplinen via aktive kunder og allokeringsmatrix.
                </DeptMatrixHeaderHint>
              </th>
              <th className="py-3 pr-2 font-medium">
                <DeptMatrixHeaderHint label="Forbr." title="Forbrug">
                  Rapporterede timer fra tidsregistrering i den valgte rapportperiode.
                </DeptMatrixHeaderHint>
              </th>
              <th className="py-3 pr-2 font-medium">
                <DeptMatrixHeaderHint label="Δ" title="Delta">
                  Difference mellem forbrug og tildelt. Positiv = overforbrug, negativ = underskud mod budget.
                </DeptMatrixHeaderHint>
              </th>
              <th className="min-w-[120px] py-3 pr-3 font-medium">
                <DeptMatrixHeaderHint label="Forbr. / tild." title="Forbrug / tildelt">
                  Andel af tildelte timer der er forbrugt. Søjlen viser forbrug mod tildelt budget (100% = budget opbrugt).
                </DeptMatrixHeaderHint>
              </th>
              <th className="min-w-[120px] py-3 pr-3 font-medium">
                <DeptMatrixHeaderHint label="Tild. / kap." title="Tildelt / kapacitet">
                  Andel af kapacitet der er solgt eller tildelt. Søjlen viser salg mod månedligt loft (over 100% = over-allokeret).
                </DeptMatrixHeaderHint>
              </th>
              <th className="hidden py-3 pr-2 font-medium md:table-cell">
                <DeptMatrixHeaderHint label="Rev." title="Omsætning">
                  Omsætning knyttet til disciplinen fra performance-data (tilgængelig i demo/Pulse).
                </DeptMatrixHeaderHint>
              </th>
              <th className="hidden py-3 pr-2 font-medium lg:table-cell">
                <DeptMatrixHeaderHint label="Perf. util." title="Performance-udnyttelse">
                  Udnyttelsesgrad for disciplinen — hvor stramt kapaciteten udnyttes ift. faktisk leverance.
                </DeptMatrixHeaderHint>
              </th>
              <th className="py-3 pr-4 font-medium">
                <DeptMatrixHeaderHint label="Status" title="Status" content={STATUS_HINT} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = r.dept;
              const perf = r.perf;
              const toneCfg = TONE_LABEL[r.tone] ?? TONE_LABEL.ok;

              return (
                <tr key={d.id} className="border-b border-border-soft last:border-0">
                  <td className="py-3 pl-4 pr-2">
                    <span className="flex items-center gap-2 font-sans text-[13px] font-semibold text-fg">
                      <span
                        className="size-2.5 shrink-0 rounded-sm ring-1 ring-border/50"
                        style={{ backgroundColor: agencyDeptColor(d.id) }}
                      />
                      {d.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-fg-muted">{d.short}</span>
                  </td>
                  <td className="py-3 pr-2 tabular-nums text-fg-muted">{r.capacity}</td>
                  <td className="py-3 pr-2 tabular-nums text-fg">{r.assigned}</td>
                  <td className="py-3 pr-2 tabular-nums text-fg">{r.tracked}</td>
                  <td
                    className={cn(
                      "py-3 pr-2 text-[11px] tabular-nums",
                      r.delta > 0 ? "text-agency-warn" : r.delta < 0 ? "text-agency-ok" : "text-fg-quiet",
                    )}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta}
                  </td>
                  <td className="py-3 pr-3">
                    <PulseUtilBar
                      hours={r.tracked}
                      budget={Math.max(r.assigned, 1)}
                      className="max-w-[160px]"
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <PulseUtilBar
                      hours={r.assigned}
                      budget={Math.max(r.capacity, 1)}
                      className="max-w-[160px]"
                    />
                  </td>
                  <td className="hidden py-3 pr-2 text-[11px] tabular-nums text-fg-muted md:table-cell">
                    {perf?.revenue != null ? formatCurrencyCompact(perf.revenue, "DKK") : "—"}
                  </td>
                  <td className="hidden py-3 pr-2 tabular-nums text-fg lg:table-cell">
                    {perf?.util != null ? formatPercent(perf.util) : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        toneCfg.className,
                      )}
                    >
                      {toneCfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-3 font-sans text-[11px] text-fg-quiet">
        Σ kapacitet: <span className="tabular-nums text-fg-muted">{rows.reduce((s, r) => s + r.capacity, 0)}</span> · Σ
        tildelt: <span className="tabular-nums text-fg-muted">{rows.reduce((s, r) => s + r.assigned, 0)}</span> · Σ forbrug:{" "}
        <span className="tabular-nums text-fg-muted">{rows.reduce((s, r) => s + r.tracked, 0)}</span>{" "}
        <span className="text-[10px]">(kontrakttimer / måned)</span>
      </div>
    </section>
  );
}
