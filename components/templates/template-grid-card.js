import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

const SCOPE_DA = {
  retainer: "Retainer",
  project: "Projekt",
  any: "Alle typer",
};

/**
 * Wire-række som i `getTaskTemplatesDemoBundle` / Mongo `buildTaskTemplateWireRow`.
 *
 * @typedef {{
 *   id: string;
 *   name: string;
 *   hint: string;
 *   dept: string;
 *   defaultPriority: string;
 *   defaultDueOffsetDays: number;
 *   estHours: number;
 *   scope: string;
 *   active: boolean;
 *   updatedAt: string;
 *   usedCount: number;
 *   billable?: boolean;
 * }} TemplateWireRow
 */

/**
 * @typedef {{ id: string; name?: string; short?: string; color?: string }} TemplateDeptRow
 */

/**
 * @param {{ row: TemplateWireRow; departments: TemplateDeptRow[] }} props
 */
export function TemplateGridCard({ row, departments }) {
  const href = `/templates/${encodeURIComponent(row.id)}`;
  const dep = departments.find((d) => d.id === row.dept);

  return (
    <Link href={href} className={cn("block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")}>
      <article
        className={cn(
          "tally-panel flex h-full flex-col p-3.5 transition-colors hover:border-agency-brand-border hover:bg-surface-muted/40",
          row.active ? "" : "opacity-65",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[13.5px] font-semibold leading-snug text-fg">{row.name}</div>
            <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-relaxed text-fg-quiet">{row.hint}</p>
          </div>
          <span
            className={cn(
              "rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted",
            )}
            style={dep?.color ? { color: dep.color } : undefined}
          >
            {dep?.short ?? dep?.name?.slice(0, 4) ?? row.dept}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <TaskPriorityChip
            priority={row.defaultPriority === "high" || row.defaultPriority === "low" ? row.defaultPriority : "medium"}
          />
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              row.active ?
                "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-border bg-surface-muted text-fg-quiet",
            )}
          >
            {row.active ? "Aktiv" : "Arkiv"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-soft pt-3 text-[11px] text-fg-muted">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Deadline (+d)</div>
            <div className="mt-0.5 tabular-nums text-fg">{row.defaultDueOffsetDays} d</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Est. timer</div>
            <div className="mt-0.5 tabular-nums text-fg">{row.estHours} t</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Tidstype</div>
            <div className="mt-0.5 text-fg">{row.billable === false ? "Intern" : "Fakturerbar"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Anvendelser</div>
            <div className="mt-0.5 tabular-nums text-agency-brand">{row.usedCount}×</div>
          </div>
        </div>

        <div className="mt-2 border-t border-border-soft pt-2 font-sans text-[10px] text-fg-muted">
          <span className="font-semibold text-fg-soft">Kundetype:</span> {SCOPE_DA[row.scope] ?? row.scope}
          <span className="mx-1.5 text-fg-quiet">·</span>
          <span className="tabular-nums">Opd. {formatIsoDateDa(row.updatedAt)}</span>
        </div>
      </article>
    </Link>
  );
}
