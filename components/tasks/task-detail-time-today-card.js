import Link from "next/link";

import { routes } from "@/config/routes";
import { formatHoursDecimalDa, formatMinutesDa } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   taskId: string;
 *   entries: {
 *     id: string;
 *     at: string;
 *     dur: number;
 *     desc: string;
 *     dept?: string | null;
 *     memberKey?: string;
 *     memberName?: string;
 *   }[];
 *   departments?: Array<{ id: string; short?: string; color?: string }>;
 *   periodLabel?: string;
 *   sourceHint?: string;
 * }} props
 */
export function TaskDetailTimeTodayCard({ taskId, entries, departments, periodLabel = "", sourceHint }) {
  const minutes = entries.reduce((s, e) => s + (Number(e.dur) || 0), 0);

  /** @type {Map<string, { name: string; minutes: number }>} */
  const byMember = new Map();
  for (const e of entries) {
    const key = e.memberKey ?? e.memberName ?? "—";
    const name = e.memberName ?? (e.memberKey ? e.memberKey : "Ukendt");
    const prev = byMember.get(key) ?? { name, minutes: 0 };
    prev.minutes += Number(e.dur) || 0;
    byMember.set(key, prev);
  }
  const memberTotals = [...byMember.values()].sort((a, b) => b.minutes - a.minutes);

  /** @type {Array<{ id: string; short?: string; color?: string }>} */
  const depRows = departments?.length ?
    departments.map((d) => ({ id: d.id, short: d.short, color: typeof d.color === "string" ? d.color : undefined }))
  : DEPARTMENTS;

  const hint =
    sourceHint ??
    (periodLabel ?
      `Filtreret til opgaven for ${periodLabel}. Ingen matchende registreringer endnu.`
    : "Alle registrerede timer på opgaven. Ingen poster endnu.");

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Tidslog</h2>
        <Link href={routes.time} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Åbn tid →
        </Link>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">{hint}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-sans text-[22px] font-semibold tabular-nums tracking-tight text-fg">
          {formatHoursDecimalDa(minutes)}
        </p>
        <p className="text-[11px] text-fg-muted">
          <span className="tabular-nums">{formatMinutesDa(minutes)}</span> total ·{" "}
          <span className="tabular-nums">{entries.length}</span> poster
        </p>
      </div>

      {memberTotals.length > 0 ?
        <ul className="mt-4 flex flex-wrap gap-2">
          {memberTotals.map((m) => (
            <li
              key={m.name}
              className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-muted/50 px-2.5 py-1"
            >
              <span className="font-sans text-[11px] font-medium text-fg">{m.name}</span>
              <span className="font-sans text-[11px] tabular-nums text-agency-brand">
                {formatHoursDecimalDa(m.minutes)}
              </span>
            </li>
          ))}
        </ul>
      : null}

      {entries.length === 0 ?
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-5 text-[13px] text-fg-muted">
          Ingen timer registreret på opgaven endnu — start evt. fra tidssiden eller timer.
        </p>
      : <ul className="mt-4 flex flex-col gap-2">
          {entries.map((e) => {
            const dep = e.dept ? depRows.find((d) => d.id === e.dept) : null;
            const who = e.memberName ?? (e.memberKey ? e.memberKey : null);
            return (
              <li
                key={e.id}
                className={cn(
                  "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border-soft",
                  "bg-surface-muted/40 px-3 py-2.5 font-sans text-[12px]",
                )}
              >
                <span className="text-[11px] tabular-nums text-fg-soft">{e.at}</span>
                <span className="text-[11px] tabular-nums text-agency-brand">{formatMinutesDa(e.dur)}</span>
                {who ?
                  <span className="text-[11px] font-medium text-fg">{who}</span>
                : null}
                {dep?.short ?
                  <span
                    className="text-[10px] font-semibold text-fg-quiet"
                    style={{ color: dep.color ?? undefined }}
                  >
                    {dep.short}
                  </span>
                : null}
                <span className="min-w-[55%] flex-1 text-fg-muted">{e.desc || "—"}</span>
              </li>
            );
          })}
        </ul>
      }
      <p className="mt-3 text-[10px] text-fg-soft">
        Opgave-id: <span className="tabular-nums">{taskId}</span>
        {periodLabel ? <> · Pulse-udsnit: {periodLabel}</> : null}
      </p>
    </div>
  );
}
