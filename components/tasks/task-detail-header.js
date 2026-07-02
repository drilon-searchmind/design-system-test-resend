"use client";

import Link from "next/link";

import { TaskPriorityChip } from "@/components/crm/task-priority-chip";
import { PulseIconDownload } from "@/components/pulse/pulse-icons";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   task: {
 *     id: string;
 *     title: string;
 *     status: 'todo' | 'doing' | 'review' | 'done' | 'blocked' | 'cancelled';
 *     priority: 'high' | 'medium' | 'low';
 *     dept: string;
 *     clientName: string;
 *     clientLogo: string;
 *     clientHue: number;
 *   };
 *   deptLabel: string;
 *   subtitle: string;
 *   trailing?: import('react').ReactNode;
 *   showExport?: boolean;
 * }} props
 */
export function TaskDetailHeader({
  task,
  deptLabel,
  subtitle,
  trailing,
  showExport = true,
}) {
  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link
          href={routes.tasks}
          className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
        >
          Opgaver
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="truncate text-fg">{task.title}</span>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-[11px] text-fg-muted">{task.id}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border",
              "text-sm font-semibold text-white md:size-[60px] md:text-[15px]",
            )}
            style={{
              background: `linear-gradient(135deg, oklch(62% 0.15 ${task.clientHue}), oklch(52% 0.18 ${task.clientHue + 28}))`,
            }}
          >
            {task.clientLogo}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Opgave · {deptLabel}
            </p>
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">{task.title}</h1>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {task.clientName}
              <br />
              {subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TaskPriorityChip priority={task.priority} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 md:mt-1">
          {trailing ?? null}
          {showExport ?
            <button
              type="button"
              className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 font-sans text-[11px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand"
            >
              <PulseIconDownload size={12} /> Eksport
            </button>
          : null}
        </div>
      </header>
    </>
  );
}
