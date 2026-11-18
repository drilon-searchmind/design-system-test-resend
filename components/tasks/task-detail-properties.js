"use client";

import { useEffect, useRef, useState } from "react";

import { ClientPicklistOptions } from "@/components/crm/client-picklist-options";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TaskFieldStatusHint } from "@/components/tasks/task-detail-inline-fields";
import { TeamMemberMultiSelect } from "@/components/tasks/team-member-multi-select";
import { formatHoursCompactDa, formatHoursDecimalDa, formatIsoDateDa } from "@/lib/crm/format-da";
import { taskDaysUntilDue, taskIsOverdue } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/** @typedef {import('@/components/tasks/use-task-field-save').TaskFieldStatus} TaskFieldStatus */
/** @typedef {(field: string, patch: Record<string, unknown>, optimistic: Record<string, unknown>) => Promise<boolean>} TaskFieldSave */
/** @typedef {{ id: string; name: string; avatar?: string; hue?: number; image?: string }} TeamWire */

const PRIORITY_OPTIONS = [
  { id: "high", label: "Høj" },
  { id: "medium", label: "Mellem" },
  { id: "low", label: "Lav" },
];

const ASSIGNEE_SAVE_DELAY_MS = 600;

const INLINE_CONTROL = cn(
  "h-7 w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5",
  "font-sans text-[13px] font-semibold text-fg outline-none transition-colors",
  "hover:border-border hover:bg-canvas focus-visible:border-border focus-visible:bg-canvas",
  "focus-visible:ring-2 focus-visible:ring-agency-brand",
);

/**
 * @param {{
 *   label: string;
 *   status?: TaskFieldStatus | null;
 *   tone?: "default" | "bad";
 *   badge?: import('react').ReactNode;
 *   className?: string;
 *   children: import('react').ReactNode;
 * }} props
 */
function PropertyCell({ label, status = null, tone = "default", badge, className, children }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border px-2 py-2",
        tone === "bad" ? "border-agency-bad-border bg-agency-bad-soft" : "border-border-soft bg-surface-muted/40",
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 px-1.5">
        <span
          className={cn(
            "truncate text-[9px] font-semibold uppercase tracking-[0.07em]",
            tone === "bad" ? "text-agency-bad" : "text-fg-soft",
          )}
        >
          {label}
        </span>
        {status ? <TaskFieldStatusHint status={status} /> : badge ?? null}
      </div>
      {children}
    </div>
  );
}

/** @param {{ children: import('react').ReactNode; muted?: boolean; className?: string }} props */
function ReadOnlyValue({ children, muted = false, className }) {
  return (
    <p
      className={cn(
        "flex h-7 min-w-0 items-center truncate px-1.5 font-sans text-[13px] font-semibold tabular-nums",
        muted ? "text-fg-muted" : "text-fg",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * @param {{
 *   assigneeIds: string[];
 *   team: TeamWire[];
 *   readOnly: boolean;
 *   status?: TaskFieldStatus | null;
 *   onSave: TaskFieldSave;
 * }} props
 */
function AssigneesField({ assigneeIds, team, readOnly, status, onSave }) {
  const [pending, setPending] = useState(/** @type {Set<string> | null} */ (null));
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const flushRef = useRef(/** @type {(() => void) | null} */ (null));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flushRef.current?.();
    };
  }, []);

  const selected = pending ?? new Set(assigneeIds);
  const teamById = new Map(team.map((m) => [m.id, m]));
  const members = [...selected].flatMap((id) => {
    const m = teamById.get(id);
    return m ? [m] : [];
  });

  /** @param {Set<string>} next */
  function handleChange(next) {
    setPending(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const keys = [...next];
    const flush = () => {
      timerRef.current = null;
      flushRef.current = null;
      void onSave("assignees", { assigneeMemberKeys: keys }, { assigneeIds: keys, assigneeId: keys[0] ?? "" });
    };
    flushRef.current = flush;
    timerRef.current = setTimeout(() => {
      flush();
      setPending(null);
    }, ASSIGNEE_SAVE_DELAY_MS);
  }

  const avatars =
    members.length ?
      <span className="flex shrink-0 -space-x-1.5">
        {members.slice(0, 3).map((m) => (
          <CrmAvatar
            key={m.id}
            label={m.avatar ?? m.name.slice(0, 2)}
            src={m.image}
            hue={m.hue ?? 220}
            className="size-6 text-[9px] ring-2 ring-canvas"
            alt={m.name}
          />
        ))}
      </span>
    : null;

  return (
    <PropertyCell label="Ansvarlige" status={status} className="col-span-2">
      <div className="flex min-w-0 items-center gap-2 px-1.5">
        {avatars}
        {readOnly ?
          <p className="min-w-0 truncate font-sans text-[13px] font-semibold text-fg">
            {members.length ? members.map((m) => m.name).join(", ") : <span className="text-fg-muted">Ikke tildelt</span>}
          </p>
        : <TeamMemberMultiSelect
            team={team}
            selected={selected}
            onChange={handleChange}
            emptyLabel="Ikke tildelt"
            allSelectedLabel={team.length === 1 ? team[0].name : "Hele teamet"}
            countLabel={(n) => `${n} ansvarlige`}
            showQuickActions={false}
            triggerClassName="h-7"
          />
        }
      </div>
    </PropertyCell>
  );
}

/**
 * @param {{
 *   dueDate: string;
 *   status: string;
 *   dueReferenceIso: string;
 *   readOnly: boolean;
 *   fieldStatus?: TaskFieldStatus | null;
 *   onSave: TaskFieldSave;
 * }} props
 */
function DueDateField({ dueDate, status, dueReferenceIso, readOnly, fieldStatus, onSave }) {
  const [draft, setDraft] = useState(/** @type {string | null} */ (null));
  const value = draft ?? dueDate;
  const overdue = taskIsOverdue({ status, dueDate }, dueReferenceIso);
  const daysLate = overdue ? -taskDaysUntilDue(dueDate, dueReferenceIso) : 0;

  function commit() {
    if (draft === null) return;
    const next = draft.trim().slice(0, 10);
    setDraft(null);
    if (next === dueDate) return;
    void onSave("dueDate", { dueDate: next || null }, { dueDate: next });
  }

  const badge =
    overdue ?
      <span className="shrink-0 rounded-md border border-agency-bad-border bg-canvas px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-wide text-agency-bad">
        Overskredet{daysLate > 0 ? ` · ${daysLate} d` : ""}
      </span>
    : null;

  return (
    <PropertyCell label="Deadline" status={fieldStatus} tone={overdue ? "bad" : "default"} badge={badge}>
      {readOnly ?
        <ReadOnlyValue muted={!dueDate} className={overdue ? "text-agency-bad" : undefined}>
          {dueDate ? formatIsoDateDa(dueDate) : "Ingen"}
        </ReadOnlyValue>
      : <input
          type="date"
          value={value}
          aria-label="Deadline"
          onFocus={() => setDraft(dueDate)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className={cn(INLINE_CONTROL, "tabular-nums", overdue && "text-agency-bad")}
        />
      }
    </PropertyCell>
  );
}

/**
 * @param {{
 *   estimateHours: number | null;
 *   readOnly: boolean;
 *   status?: TaskFieldStatus | null;
 *   onSave: TaskFieldSave;
 * }} props
 */
function EstimateField({ estimateHours, readOnly, status, onSave }) {
  const [draft, setDraft] = useState(/** @type {string | null} */ (null));
  const current = typeof estimateHours === "number" && Number.isFinite(estimateHours) ? estimateHours : null;
  const value = draft ?? (current === null ? "" : String(current));

  function commit() {
    if (draft === null) return;
    const raw = draft.trim().replace(",", ".");
    setDraft(null);
    if (raw === "") {
      if (current !== null) void onSave("estimateHours", { estimateHours: null }, { estimateHours: null });
      return;
    }
    const next = Number.parseFloat(raw);
    if (!Number.isFinite(next) || next < 0 || next === current) return;
    void onSave("estimateHours", { estimateHours: next }, { estimateHours: next });
  }

  return (
    <PropertyCell label="Estimeret (t)" status={status}>
      {readOnly ?
        <ReadOnlyValue muted={current === null}>
          {current === null ? "Ikke sat" : `${formatHoursCompactDa(current)} t`}
        </ReadOnlyValue>
      : <input
          type="number"
          min={0}
          step={0.5}
          inputMode="decimal"
          value={value}
          placeholder="Ikke sat"
          aria-label="Estimerede timer"
          onFocus={() => setDraft(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(null);
            }
          }}
          className={cn(INLINE_CONTROL, "tabular-nums placeholder:font-medium placeholder:text-fg-quiet")}
        />
      }
    </PropertyCell>
  );
}

/**
 * @param {{
 *   task: {
 *     status: string;
 *     dueDate: string;
 *     priority: string;
 *     dept: string;
 *     clientId: string;
 *     clientName: string;
 *     billable: boolean;
 *     estimateHours: number | null;
 *     assigneeIds: string[];
 *     isSubTask: boolean;
 *   };
 *   team: TeamWire[];
 *   departments: Array<{ id: string; name: string }>;
 *   clientsPicklist: Array<{ value: string; label: string; group?: string }>;
 *   loggedMinutes: number;
 *   dueReferenceIso: string;
 *   readOnly: boolean;
 *   fieldStatus: Record<string, TaskFieldStatus>;
 *   onSave: TaskFieldSave;
 * }} props
 */
export function TaskDetailProperties({
  task,
  team,
  departments,
  clientsPicklist,
  loggedMinutes,
  dueReferenceIso,
  readOnly,
  fieldStatus,
  onSave,
}) {
  const deptKey = task.dept && task.dept !== "—" ? task.dept : "";
  const deptName = departments.find((d) => d.id === deptKey)?.name ?? (deptKey ? deptKey.toUpperCase() : "—");
  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.id === task.priority)?.label ?? "Mellem";
  const hasClientOption = clientsPicklist.some((c) => c.value === task.clientId);

  return (
    <section aria-label="Opgavefelter" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
      <AssigneesField
        assigneeIds={task.assigneeIds}
        team={team}
        readOnly={readOnly}
        status={fieldStatus.assignees}
        onSave={onSave}
      />

      <PropertyCell label={task.isSubTask ? "Kunde (arvet)" : "Kunde"} status={fieldStatus.client} className="col-span-2">
        {readOnly || task.isSubTask ?
          <ReadOnlyValue>{task.clientName || "—"}</ReadOnlyValue>
        : <select
            value={task.clientId}
            aria-label="Kunde"
            onChange={(e) => {
              const slug = e.target.value;
              if (!slug) return;
              const label = clientsPicklist.find((c) => c.value === slug)?.label ?? task.clientName;
              void onSave("client", { clientSlug: slug }, { clientId: slug, clientName: label });
            }}
            className={INLINE_CONTROL}
          >
            {!hasClientOption ? <option value={task.clientId}>{task.clientName || "—"}</option> : null}
            <ClientPicklistOptions items={clientsPicklist} />
          </select>
        }
      </PropertyCell>

      <DueDateField
        dueDate={task.dueDate}
        status={task.status}
        dueReferenceIso={dueReferenceIso}
        readOnly={readOnly}
        fieldStatus={fieldStatus.dueDate}
        onSave={onSave}
      />

      <PropertyCell label={task.isSubTask ? "Prioritet (arvet)" : "Prioritet"} status={fieldStatus.priority}>
        {readOnly || task.isSubTask ?
          <ReadOnlyValue>{priorityLabel}</ReadOnlyValue>
        : <select
            value={task.priority}
            aria-label="Prioritet"
            onChange={(e) => void onSave("priority", { priority: e.target.value }, { priority: e.target.value })}
            className={INLINE_CONTROL}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        }
      </PropertyCell>

      <PropertyCell label="Disciplin" status={fieldStatus.dept}>
        {readOnly ?
          <ReadOnlyValue>{deptName}</ReadOnlyValue>
        : <select
            value={deptKey}
            aria-label="Disciplin"
            onChange={(e) => {
              const next = e.target.value;
              void onSave("dept", { departmentKey: next || null }, { dept: next || "—" });
            }}
            className={INLINE_CONTROL}
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        }
      </PropertyCell>

      <EstimateField
        estimateHours={task.estimateHours}
        readOnly={readOnly}
        status={fieldStatus.estimateHours}
        onSave={onSave}
      />

      <PropertyCell label="Tidstype" status={fieldStatus.billable} className="col-span-2">
        {readOnly ?
          <ReadOnlyValue>{task.billable ? "Fakturerbar" : "Intern"}</ReadOnlyValue>
        : <PulseSegmentedControl
            size="sm"
            active={task.billable ? "yes" : "no"}
            onChange={(id) => {
              const next = id === "yes";
              if (next === task.billable) return;
              void onSave("billable", { billable: next }, { billable: next });
            }}
            tabs={[
              { id: "yes", label: "Fakturerbar" },
              { id: "no", label: "Intern" },
            ]}
            className="self-start"
          />
        }
      </PropertyCell>

      <PropertyCell label="Registreret" className="col-span-2">
        <ReadOnlyValue muted={loggedMinutes <= 0}>
          {loggedMinutes > 0 ? formatHoursDecimalDa(loggedMinutes) : "0 t"}
        </ReadOnlyValue>
      </PropertyCell>
    </section>
  );
}
