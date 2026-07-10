"use client";

import { useCallback, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TeamMemberMultiSelect } from "@/components/tasks/team-member-multi-select";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   departments: Array<{ id: string; name?: string }>;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   submitting?: boolean;
 *   error?: string | null;
 *   onSubmit: (body: Record<string, unknown>) => void;
 *   onCancel: () => void;
 *   variant?: "modal" | "card";
 * }} props
 */
export function TemplatesCreateForm({
  departments,
  team,
  submitting,
  error,
  onSubmit,
  onCancel,
  variant = "modal",
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentKey, setDepartmentKey] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState(() => new Set());
  const [defaultPriority, setDefaultPriority] = useState("medium");
  const [defaultDueOffsetDays, setDefaultDueOffsetDays] = useState("7");
  const [suggestedHours, setSuggestedHours] = useState("");
  const [scope, setScope] = useState("retainer");
  const [billable, setBillable] = useState(/** @type {"yes" | "no"} */ ("yes"));
  const [active, setActive] = useState(true);

  const submit = useCallback(() => {
    const dod = Number.parseInt(defaultDueOffsetDays, 10);
    /** @type {Record<string, unknown>} */
    const body = {
      title: title.trim(),
      description,
      defaultPriority,
      scope,
      active,
      billable: billable === "yes",
    };
    if (departmentKey.trim() && departmentKey !== "—") body.departmentKey = departmentKey.trim();
    if (Number.isFinite(dod)) body.defaultDueOffsetDays = dod;
    const shNum = suggestedHours.trim() === "" ? Number.NaN : Number.parseFloat(suggestedHours.replace(",", "."));
    if (Number.isFinite(shNum)) body.suggestedHours = shNum;
    if (selectedAssignees.size) body.assigneeMemberKeys = [...selectedAssignees];
    onSubmit(body);
  }, [
    active,
    billable,
    defaultDueOffsetDays,
    defaultPriority,
    departmentKey,
    description,
    onSubmit,
    scope,
    selectedAssignees,
    suggestedHours,
    title,
  ]);

  const isModal = variant === "modal";

  return (
    <div
      className={cn(isModal ? "flex flex-col gap-4" : "tally-panel p-4 md:p-5")}
      role="region"
      aria-label={isModal ? "Opret ny opgaveskabelon — formular" : "Opret skabelon"}
    >
      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <div className={cn("grid gap-4 sm:grid-cols-2", !isModal && "mt-4")}>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted sm:col-span-2">
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
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <span>Beskrivelse / hint</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(
              "resize-y rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Disciplin</span>
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
                {d.name ?? d.id}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 font-sans text-[12px] text-fg-muted">
          <span>Ansvarlige</span>
          <TeamMemberMultiSelect
            team={team}
            selected={selectedAssignees}
            onChange={setSelectedAssignees}
            emptyLabel="Vælg ansvarlige"
            allSelectedLabel="Alle ansvarlige"
            countLabel={(n) => `${n} ansvarlige`}
            showQuickActions
          />
        </div>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Prioritet (standard)</span>
          <select
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value)}
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
          <span>Kundetype</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            <option value="retainer">Retainer</option>
            <option value="project">Projekt</option>
            <option value="any">Alle typer</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Standard deadline (+kalenderdage)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={defaultDueOffsetDays}
            onChange={(e) => setDefaultDueOffsetDays(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Forslag timer (valgfrit)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="fx 4"
            value={suggestedHours}
            onChange={(e) => setSuggestedHours(e.target.value)}
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
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 font-sans text-[12px] text-fg-muted">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" />
        Aktiv skabelon
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit()}
          disabled={submitting || !title.trim()}
          className={cn(
            "rounded-md px-4 py-2 font-sans text-[13px] font-medium text-white",
            "bg-agency-brand hover:opacity-90 disabled:opacity-40",
          )}
        >
          {submitting ? "Gemmer…" : "Gem skabelon"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void onCancel()}
          className="rounded-md border border-border px-4 py-2 font-sans text-[13px] text-fg-muted hover:bg-surface-muted disabled:opacity-40"
        >
          Annuller
        </button>
      </div>
    </div>
  );
}
