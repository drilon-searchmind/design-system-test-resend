"use client";

import { useCallback, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

/**
 * @param {number} offsetDays
 */
function isoDatePlusCalendarDays(offsetDays) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/**
 * @typedef {{
 *   key: string;
 *   title: string;
 *   hint: string;
 *   departmentKey: string;
 *   priority: "high" | "medium" | "low";
 *   suggestedHours: number | null;
 *   defaultDueOffsetDays: number;
 * }} TaskTemplatePreset
 */

/**
 * @param {{
 *   departments: Array<{ id: string; name: string }>;
 *   team: Array<{ id: string; name: string }>;
 *   clientsPicklist: Array<{ value: string; label: string }>;
 *   taskTemplatesForCreate?: TaskTemplatePreset[];
 *   submitting?: boolean;
 *   error?: string | null;
 *   onSubmit: (body: Record<string, unknown>) => void;
 *   onCancel: () => void;
 *   variant?: "card" | "modal";
 * }} props
 */
export function TasksCreateForm({
  departments,
  team,
  clientsPicklist,
  taskTemplatesForCreate = [],
  submitting,
  error,
  onSubmit,
  onCancel,
  variant = "card",
}) {
  const [templateKey, setTemplateKey] = useState("");
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [clientSlug, setClientSlug] = useState(clientsPicklist[0]?.value ?? "");
  const [departmentKey, setDepartmentKey] = useState("");
  const [assigneeMemberKey, setAssigneeMemberKey] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [billable, setBillable] = useState(/** @type {"yes" | "no"} */ ("yes"));
  const [estimateHours, setEstimateHours] = useState("");

  const applyTemplate = useCallback(
    (nextKey) => {
      setTemplateKey(nextKey);
      if (!nextKey) return;
      const tpl = taskTemplatesForCreate.find((t) => t.key === nextKey);
      if (!tpl) return;
      setTitle(tpl.title);
      setHint(tpl.hint ?? "");
      setDepartmentKey(tpl.departmentKey ? tpl.departmentKey : "");
      setPriority(tpl.priority);
      if (typeof tpl.defaultDueOffsetDays === "number" && Number.isFinite(tpl.defaultDueOffsetDays)) {
        setDueDate(isoDatePlusCalendarDays(tpl.defaultDueOffsetDays));
      }
      if (typeof tpl.suggestedHours === "number" && Number.isFinite(tpl.suggestedHours)) {
        setEstimateHours(String(tpl.suggestedHours));
      } else {
        setEstimateHours("");
      }
    },
    [taskTemplatesForCreate],
  );

  const submit = useCallback(() => {
    /** @type {Record<string, unknown>} */
    const body = {
      title: title.trim(),
      hint,
      clientSlug,
      priority,
      status,
      billable: billable === "yes",
    };
    if (dueDate.trim()) body.dueDate = dueDate.trim().slice(0, 10);
    if (departmentKey && departmentKey !== "—") body.departmentKey = departmentKey;
    if (assigneeMemberKey.trim()) body.assigneeMemberKey = assigneeMemberKey.trim();
    if (templateKey.trim()) body.templateKey = templateKey.trim();
    const ehRaw = estimateHours.trim().replace(",", ".");
    if (ehRaw !== "") {
      const eh = Number.parseFloat(ehRaw);
      if (Number.isFinite(eh)) body.estimateHours = eh;
    }
    onSubmit(body);
  }, [
    title,
    hint,
    clientSlug,
    departmentKey,
    assigneeMemberKey,
    dueDate,
    priority,
    status,
    billable,
    templateKey,
    estimateHours,
    onSubmit,
  ]);

  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        isModal ? "flex flex-col gap-4" : "tally-panel p-4 md:p-5",
      )}
      role="region"
      aria-label={isModal ? "Opret ny opgave — formular" : "Opret opgave"}
    >
      {isModal ? null : (
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Ny opgave</h2>
      )}
      <div className={cn("grid gap-4 sm:grid-cols-2", !isModal && "mt-4")}>
        {taskTemplatesForCreate.length > 0 ?
          <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted sm:col-span-2">
            <span>Skabelon (valgfri)</span>
            <select
              value={templateKey}
              onChange={(e) => applyTemplate(e.target.value)}
              className={cn(
                "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            >
              <option value="">— Ingen (start forfra)</option>
              {taskTemplatesForCreate.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="font-sans text-[11px] leading-snug text-fg-quiet">
              Udfylder titel, hint, disciplin, prioritet, deadline og timer ud fra Task template; du kan rette alt før
              oprettelse. Opgaven kobles til skabelonen i databasen.
            </span>
          </label>
        : null}
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Titel *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Kunde *</span>
          <select
            value={clientSlug}
            onChange={(e) => setClientSlug(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            {clientsPicklist.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <span>Hint / noter</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Afdeling</span>
          <select
            value={departmentKey}
            onChange={(e) => setDepartmentKey(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Ansvarlig</span>
          <select
            value={assigneeMemberKey}
            onChange={(e) => setAssigneeMemberKey(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            <option value="">—</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Deadline</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Estimerede timer</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valgfri"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <div className="flex flex-col gap-1.5 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <span>Tidstype</span>
          <PulseSegmentedControl
            size="sm"
            active={billable}
            onChange={(id) => setBillable(/** @type {"yes" | "no"} */ (id))}
            tabs={[
              { id: "yes", label: "Fakturerbar" },
              { id: "no", label: "Intern" },
            ]}
          />
          <span className="font-sans text-[11px] leading-snug text-fg-quiet">
            Styrer standard for tidsregistrering på opgaven — kan overrides i timer.
          </span>
        </div>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Prioritet</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            <option value="high">Høj</option>
            <option value="medium">Medium</option>
            <option value="low">Lav</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            <option value="todo">Todo</option>
            <option value="doing">I gang</option>
            <option value="review">Review</option>
            <option value="blocked">Blokeret</option>
            <option value="done">Færdig</option>
            <option value="cancelled">Afbrudt</option>
          </select>
        </label>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting || !title.trim()}
          onClick={() => submit()}
          className={cn(
            "inline-flex h-9 items-center rounded-md px-4 font-sans text-[13px] font-medium",
            "bg-agency-brand text-white hover:opacity-90 disabled:opacity-40",
          )}
        >
          {submitting ? "Opretter…" : "Opret"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-border bg-surface-muted px-4 font-sans text-[13px] text-fg-muted hover:bg-surface-card"
        >
          Annuller
        </button>
      </div>
    </div>
  );
}
