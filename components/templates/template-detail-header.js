"use client";

import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

const SCOPE_DA = {
  retainer: "Retainer",
  project: "Projekt",
  any: "Alle typer",
};

/**
 * @param {{
 *   templateRow: {
 *     id: string;
 *     name: string;
 *     hint: string;
 *     dept: string;
 *     deptLabel: string;
 *     scope: string;
 *     active: boolean;
 *     defaultPriority: string;
 *     defaultDueOffsetDays: number;
 *     estHours: number;
 *     usedCount: number;
 *     updatedAt: string;
 *     assigneeLabel: string;
 *     tidstypeLabel: string;
 *   };
 *   trailing?: import('react').ReactNode;
 * }} props
 */
export function TemplateDetailHeader({ templateRow, trailing }) {
  const prio =
    templateRow.defaultPriority === "high" || templateRow.defaultPriority === "low"
      ? templateRow.defaultPriority
      : /** @type {'medium'} */ ("medium");

  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link
          href={routes.templates}
          className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
        >
          Opgaveskabeloner
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="truncate text-fg">{templateRow.name}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-agency-brand-soft",
              "text-sm font-semibold text-agency-brand md:size-[60px] md:text-[15px]",
            )}
            aria-hidden
          >
            {templateRow.name.trim().slice(0, 2).toUpperCase() || "T"}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Skabelon · {templateRow.deptLabel}
            </p>
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">{templateRow.name}</h1>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {SCOPE_DA[templateRow.scope] ?? templateRow.scope}
              <span className="mx-2 text-fg-quiet">·</span>
              <span className="tabular-nums text-fg-quiet">{templateRow.usedCount} tilknyttede opgaver</span>
              <span className="mx-2 text-fg-quiet">·</span>
              Sidst red. <span className="text-[11px]">{templateRow.updatedAt || "—"}</span>
            </p>
            {templateRow.hint ?
              <p className="mt-2 max-w-prose whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-fg-quiet">
                {templateRow.hint}
              </p>
            : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <TaskPriorityChip priority={prio} />
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  templateRow.active
                    ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                    : "border-border bg-surface-muted text-fg-quiet",
                )}
              >
                {templateRow.active ? "Aktiv i bibliotek" : "Arkiveret"}
              </span>
            </div>

            <p className="mt-4 text-[11px] text-fg-muted">
              Standarddeadline (+d): <span className="tabular-nums text-fg-soft">{templateRow.defaultDueOffsetDays}</span>
              {" · "}
              Est. timer (forslag): <span className="tabular-nums text-fg-soft">{templateRow.estHours}</span>
              {" · "}
              Ansvarlige: <span className="text-fg-soft">{templateRow.assigneeLabel}</span>
              {" · "}
              Tidstype: <span className="text-fg-soft">{templateRow.tidstypeLabel}</span>
            </p>
          </div>
        </div>

        {trailing ?
          <div className="flex shrink-0 flex-col items-end gap-2 md:mt-1">{trailing}</div>
        : null}
      </header>
    </>
  );
}
