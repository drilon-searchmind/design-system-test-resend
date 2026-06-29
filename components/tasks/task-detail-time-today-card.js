import Link from "next/link";

import { routes } from "@/config/routes";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   taskId: string;
 *   entries: { id: string; at: string; dur: number; desc: string; dept?: string | null }[];
 *   departments?: Array<{ id: string; short?: string; color?: string }>;
 *   periodLabel?: string;
 *   sourceHint?: string;
 * }} props
 */
export function TaskDetailTimeTodayCard({ taskId, entries, departments, periodLabel = "", sourceHint }) {
  const minutes = entries.reduce((s, e) => s + (Number(e.dur) || 0), 0);

  /** @type {Array<{ id: string; short?: string; color?: string }>} */
  const depRows = departments?.length ?
    departments.map((d) => ({ id: d.id, short: d.short, color: typeof d.color === "string" ? d.color : undefined }))
  : DEPARTMENTS;

  const hint =
    sourceHint ??
    `Filtreret til opgaven for ${periodLabel || "perioden"}. Ingen matchende registreringer endnu.`;

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Tidslog (periode)</h2>
        <Link href={routes.time} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Åbn tid →
        </Link>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">{hint}</p>
      <p className="mt-1 text-[10px] text-fg-soft">
        <span className="tabular-nums">{minutes} min</span> total ·{" "}
        <span className="tabular-nums">{entries.length}</span> poster ·{" "}
        <span className="">{taskId}</span>
        {periodLabel ? <> · Udsnit: {periodLabel}</> : null}
      </p>
      {entries.length === 0 ?
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-5 text-[13px] text-fg-muted">
          Ingen bilable registreringer med task-reference i udvalgte måned endnu — start evt. fra tidssiden/timer.
        </p>
      : <ul className="mt-4 flex flex-col gap-2">
          {entries.map((e) => {
            const dep = e.dept ? depRows.find((d) => d.id === e.dept) : null;
            return (
              <li
                key={e.id}
                className={cn(
                  "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border-soft",
                  "bg-surface-muted/40 px-3 py-2.5 font-sans text-[12px]",
                )}
              >
                <span className="text-[11px] tabular-nums text-fg-soft">{e.at}</span>
                <span className="text-[11px] tabular-nums text-agency-brand">{e.dur} m</span>
                {dep?.short ?
                  <span
                    className="text-[10px] font-semibold text-fg-quiet"
                    style={{ color: dep.color ?? undefined }}
                  >
                    {dep.short}
                  </span>
                : null}
                <span className="min-w-[55%] flex-1 text-fg-muted">{e.desc}</span>
              </li>
            );
          })}
        </ul>
      }
    </div>
  );
}
