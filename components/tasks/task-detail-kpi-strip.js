"use client";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { PulseKpiCard } from "@/components/pulse/pulse-kpi-card";
import { formatHoursCompactDa, formatIsoDateDa } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { taskDaysUntilDue, taskDueReferenceTodayIso, taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   task: {
 *     dept: string;
 *     dueDate: string;
 *     status: string;
 *     estimateHours?: number | null;
 *   };
 *   assigneeName: string | null;
 *   assignee?: { name: string; avatar?: string; hue?: number; image?: string } | null;
 *   departments?: Array<{ id: string; name?: string }>;
 *   dueReferenceIso?: string;
 * }} props
 */
export function TaskDetailKpiStrip({
  task,
  assigneeName,
  assignee = null,
  departments,
  dueReferenceIso = taskDueReferenceTodayIso(),
}) {
  const open = !taskIsDone(task.status);
  const overdue = taskIsOverdue(task, dueReferenceIso);
  const days = open ? taskDaysUntilDue(task.dueDate, dueReferenceIso) : null;

  const dueTone =
    !open ? "ok" : days === null || !Number.isFinite(days) ? "brand" : overdue ? "bad" : days <= 7 ? "warn" : "ok";

  const daysLabel = !open ? "—" : overdue ? `${Math.abs(days ?? 0)} d overskredet` : days === 0 ? "I dag" : `Om ${days} d`;

  const list = departments ?? DEPARTMENTS;
  const dep = list.find((d) => String(d.id) === String(task.dept));

  const disc =
    typeof dep?.name === "string" ? dep.name : task.dept && task.dept !== "—" ? task.dept.toUpperCase() : "—";

  const assigneeLabel = assigneeName ?? "Ikke tildelt";

  const estimateLabel =
    typeof task.estimateHours === "number" && Number.isFinite(task.estimateHours) ?
      `${formatHoursCompactDa(task.estimateHours)} t`
    : "Ikke sat";

  const estimateTone =
    typeof task.estimateHours === "number" && Number.isFinite(task.estimateHours) ? "brand" : "ok";

  return (
    <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-5">
      <PulseKpiCard label="Disciplin" value={disc} tone="brand" />
      <div className="tally-panel relative overflow-hidden p-4 md:p-5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-soft">Ansvarlig</p>
        <div className="mt-2 flex min-w-0 items-center gap-2.5">
          {assigneeName && assignee ?
            <CrmAvatar
              label={assignee.avatar ?? assignee.name.slice(0, 2)}
              src={assignee.image}
              hue={assignee.hue ?? 220}
              className="size-9 text-[11px]"
              alt={assignee.name}
            />
          : assigneeName ?
            <CrmAvatar label={assigneeLabel.slice(0, 2)} hue={220} className="size-9 text-[11px]" alt={assigneeLabel} />
          : null}
          <p
            className={cn(
              "min-w-0 truncate text-[18px] font-semibold leading-tight tracking-tight text-fg",
              !assigneeName && "text-fg-muted",
            )}
          >
            {assigneeLabel}
          </p>
        </div>
      </div>
      <PulseKpiCard label="Deadline" value={formatIsoDateDa(task.dueDate)} tone={dueTone} />
      <PulseKpiCard label="Estimerede timer" value={estimateLabel} tone={estimateTone} />
      <PulseKpiCard label="Afstand til deadline" value={daysLabel} tone={dueTone} />
    </section>
  );
}
