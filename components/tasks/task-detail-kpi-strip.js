"use client";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import {
  IconCalendar,
  IconClock,
  IconLayers,
  IconTimer,
  IconUser,
} from "@/components/crm/icons";
import { formatHoursCompactDa, formatHoursDecimalDa, formatIsoDateDa } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { taskDaysUntilDue, taskDueReferenceTodayIso, taskIsDone, taskIsOverdue } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

const TONE_ICON = {
  brand: "text-agency-brand bg-agency-brand-soft border-agency-brand-border",
  ok: "text-agency-ok bg-agency-ok-soft border-agency-ok-border",
  warn: "text-agency-warn bg-agency-warn-soft border-agency-warn-border",
  bad: "text-agency-bad bg-agency-bad-soft border-agency-bad-border",
};

/**
 * @param {{
 *   icon: import("react").ReactNode;
 *   label: string;
 *   value: string;
 *   tone?: keyof typeof TONE_ICON;
 *   children?: import("react").ReactNode;
 * }} props
 */
function TaskDetailCompactKpi({ icon, label, value, tone = "brand", children }) {
  const toneClass = TONE_ICON[tone] ?? TONE_ICON.brand;

  return (
    <div className="tally-panel flex min-w-[9.5rem] flex-1 items-center gap-2.5 px-3 py-2.5">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg border",
          toneClass,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-fg-soft">{label}</p>
        {children ?? (
          <p className="truncate font-sans text-[13px] font-semibold leading-tight tabular-nums text-fg">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

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
 *   loggedMinutes?: number;
 * }} props
 */
export function TaskDetailKpiStrip({
  task,
  assigneeName,
  assignee = null,
  departments,
  dueReferenceIso = taskDueReferenceTodayIso(),
  loggedMinutes = 0,
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

  const loggedLabel = loggedMinutes > 0 ? formatHoursDecimalDa(loggedMinutes) : "0 t";
  const loggedTone = loggedMinutes > 0 ? "brand" : "ok";

  return (
    <section className="flex flex-wrap gap-2">
      <TaskDetailCompactKpi
        icon={<IconLayers size={14} />}
        label="Disciplin"
        value={disc}
        tone="brand"
      />
      <TaskDetailCompactKpi
        icon={<IconUser size={14} />}
        label="Ansvarlig"
        value={assigneeLabel}
        tone={assigneeName ? "brand" : "ok"}
      >
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {assigneeName && assignee ?
            <CrmAvatar
              label={assignee.avatar ?? assignee.name.slice(0, 2)}
              src={assignee.image}
              hue={assignee.hue ?? 220}
              className="size-5 text-[8px]"
              alt={assignee.name}
            />
          : null}
          <p
            className={cn(
              "min-w-0 truncate font-sans text-[13px] font-semibold leading-tight text-fg",
              !assigneeName && "text-fg-muted",
            )}
          >
            {assigneeLabel}
          </p>
        </div>
      </TaskDetailCompactKpi>
      <TaskDetailCompactKpi
        icon={<IconCalendar size={14} />}
        label="Deadline"
        value={formatIsoDateDa(task.dueDate)}
        tone={dueTone}
      />
      <TaskDetailCompactKpi
        icon={<IconTimer size={14} />}
        label="Estimeret"
        value={estimateLabel}
        tone={estimateTone}
      />
      <TaskDetailCompactKpi
        icon={<IconClock size={14} />}
        label="Registreret"
        value={loggedLabel}
        tone={loggedTone}
      />
      <TaskDetailCompactKpi
        icon={<IconClock size={14} />}
        label="Til deadline"
        value={daysLabel}
        tone={dueTone}
      />
    </section>
  );
}
