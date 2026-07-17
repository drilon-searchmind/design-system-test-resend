"use client";

import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

/** @typedef {import('@/lib/crm/task-edit-utils').TaskEditDraft} TaskEditDraft */

/**
 * @param {{
 *   draft: TaskEditDraft;
 *   onChange: (next: TaskEditDraft) => void;
 *   departments: Array<{ id: string; name?: string }>;
 *   team: Array<{ id: string; name: string }>;
 *   clientsPicklist: Array<{ value: string; label: string }>;
 *   deleting?: boolean;
 *   onDelete?: () => void;
 *   isSubTask?: boolean;
 *   inheritedClientName?: string;
 *   inheritedPriorityLabel?: string;
 * }} props
 */
export function TaskDetailEditForm({
  draft,
  onChange,
  departments,
  team,
  clientsPicklist,
  deleting = false,
  onDelete,
  isSubTask = false,
  inheritedClientName = "",
  inheritedPriorityLabel = "",
}) {
  /** @param {Partial<TaskEditDraft>} patch */
  function patchDraft(patch) {
    onChange({ ...draft, ...patch });
  }

  /** @param {keyof TaskEditDraft} field */
  function setField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  const deptOptions = [{ id: "", label: "—" }, ...departments.map((d) => ({ id: d.id, label: d.name ?? d.id }))];

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Opgave</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Titel" required className="sm:col-span-2">
            <input value={draft.title} onChange={(e) => setField("title", e.target.value)} className={clientEditInputClass} />
          </Field>
          {isSubTask ?
            <>
              <Field label="Kunde (arvet)">
                <input value={inheritedClientName || draft.clientSlug} readOnly disabled className={clientEditInputClass} />
              </Field>
              <Field label="Prioritet (arvet)">
                <input value={inheritedPriorityLabel || draft.priority} readOnly disabled className={clientEditInputClass} />
              </Field>
            </>
          : <Field label="Kunde" required>
              <select
                value={draft.clientSlug}
                onChange={(e) => setField("clientSlug", e.target.value)}
                className={clientEditInputClass}
              >
                {clientsPicklist.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          }
          <Field label="Deadline">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Hint" className="hidden sm:col-span-2">
            <input value={draft.hint} onChange={(e) => setField("hint", e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Disciplin">
            <select
              value={draft.departmentKey}
              onChange={(e) => setField("departmentKey", e.target.value)}
              className={clientEditInputClass}
            >
              {deptOptions.map((d) => (
                <option key={d.id || "none"} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ansvarlig">
            <select
              value={draft.assigneeMemberKey}
              onChange={(e) => setField("assigneeMemberKey", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="">—</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          {!isSubTask ?
            <Field label="Prioritet">
              <select value={draft.priority} onChange={(e) => setField("priority", e.target.value)} className={clientEditInputClass}>
                <option value="high">Høj</option>
                <option value="medium">Medium</option>
                <option value="low">Lav</option>
              </select>
            </Field>
          : null}
          <Field label="Estimerede timer">
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.estimateHours}
              onChange={(e) => setField("estimateHours", e.target.value)}
              placeholder="fx 8"
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Tidstype" className="sm:col-span-2">
            <PulseSegmentedControl
              size="sm"
              active={draft.billable}
              onChange={(id) => setField("billable", /** @type {"yes" | "no"} */ (id))}
              tabs={[
                { id: "yes", label: "Fakturerbar" },
                { id: "no", label: "Intern" },
              ]}
            />
          </Field>
        </div>
      </div>

      {onDelete ?
        <div className="flex justify-end">
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className={cn(
              "h-9 rounded-md border border-agency-bad-border bg-agency-bad-soft px-3",
              "font-sans text-[13px] font-medium text-agency-bad hover:opacity-90 disabled:opacity-40",
            )}
          >
            {deleting ? "Sletter…" : "Slet opgave"}
          </button>
        </div>
      : null}
    </div>
  );
}

/** @param {{ label: string; children: import('react').ReactNode; required?: boolean; className?: string }} props */
function Field({ label, children, required, className }) {
  return (
    <label className={cn("flex flex-col gap-1 font-sans text-[12px] text-fg-muted", className)}>
      <span>
        {label}
        {required ? <span className="text-agency-brand"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
