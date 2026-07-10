"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TeamMemberMultiSelect } from "@/components/tasks/team-member-multi-select";
import { routes } from "@/config/routes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   save: () => Promise<void>;
 *   reset: () => void;
 * }} TemplateDetailMongoPanelHandle
 */

/**
 * PATCH/DELETE matcher `updateTaskTemplateMongo` / API.
 *
 * @param {{
 *   templateRouteId: string;
 *   wire: Record<string, unknown>;
 *   departments: Array<{ id: string; name?: string }>;
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   busy?: boolean;
 *   notice?: string | null;
 *   onBusyChange?: (b: boolean) => void;
 *   onNotice?: (s: string | null) => void;
 *   onReload: () => void | Promise<void>;
 *   variant?: "standalone" | "inline";
 *   onSaved?: () => void;
 * }} props
 */
export const TemplateDetailMongoPanel = forwardRef(function TemplateDetailMongoPanel(
  {
    templateRouteId,
    wire,
    departments,
    team,
    busy = false,
    notice,
    onBusyChange,
    onNotice,
    onReload,
    variant = "standalone",
    onSaved,
  },
  ref,
) {
  const router = useRouter();
  const [title, setTitle] = useState(String(wire.name ?? ""));
  const [description, setDescription] = useState(typeof wire.hint === "string" ? wire.hint : "");
  const [departmentKey, setDepartmentKey] = useState(typeof wire.dept === "string" ? wire.dept : "");
  const [defaultPriority, setDefaultPriority] = useState(String(wire.defaultPriority ?? "medium"));
  const [scope, setScope] = useState(String(wire.scope ?? "retainer"));
  const [defaultDueOffsetDays, setDefaultDueOffsetDays] = useState(
    typeof wire.defaultDueOffsetDays === "number" && Number.isFinite(wire.defaultDueOffsetDays) ?
      String(wire.defaultDueOffsetDays)
    : "0",
  );
  const [suggestedHours, setSuggestedHours] = useState(() => {
    const eh = typeof wire.estHours === "number" && Number.isFinite(wire.estHours) ? wire.estHours : null;
    return eh !== null ? String(eh) : "";
  });
  const [selectedAssignees, setSelectedAssignees] = useState(() => new Set());
  const [billable, setBillable] = useState(/** @type {"yes" | "no"} */ (wire.billable === false ? "no" : "yes"));
  const [active, setActive] = useState(wire.active !== false);

  const reset = useCallback(() => {
    setTitle(String(wire.name ?? ""));
    setDescription(typeof wire.hint === "string" ? wire.hint : "");
    setDepartmentKey(typeof wire.dept === "string" ? wire.dept : "");
    setDefaultPriority(String(wire.defaultPriority ?? "medium"));
    setScope(String(wire.scope ?? "retainer"));
    setDefaultDueOffsetDays(
      typeof wire.defaultDueOffsetDays === "number" && Number.isFinite(wire.defaultDueOffsetDays) ?
        String(wire.defaultDueOffsetDays)
      : "0",
    );
    setSuggestedHours(() => {
      const eh = typeof wire.estHours === "number" && Number.isFinite(wire.estHours) ? wire.estHours : null;
      return eh !== null ? String(eh) : "";
    });
    const keys = Array.isArray(wire.assigneeMemberKeys) ?
      wire.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
    : [];
    setSelectedAssignees(new Set(keys));
    setBillable(wire.billable === false ? "no" : "yes");
    setActive(wire.active !== false);
  }, [wire]);

  const deptOptions = useMemo(
    () => [{ id: "", label: "—" }, ...departments.map((d) => ({ id: d.id, label: d.name ?? d.id }))],
    [departments],
  );

  useEffect(() => {
    queueMicrotask(() => reset());
  }, [reset]);

  const save = useCallback(async () => {
    onBusyChange?.(true);
    onNotice?.(null);
    try {
      const qs = databaseApiQuery();
      /** @type {Record<string, unknown>} */
      const body = {
        title: title.trim(),
        description,
        defaultPriority,
        scope,
        active,
        billable: billable === "yes",
        assigneeMemberKeys: [...selectedAssignees],
      };
      if (departmentKey === "" || departmentKey === "—") body.departmentKey = null;
      else body.departmentKey = departmentKey;

      const dod = Number.parseInt(defaultDueOffsetDays, 10);
      if (Number.isFinite(dod)) body.defaultDueOffsetDays = dod;
      else body.defaultDueOffsetDays = null;

      const shRaw = suggestedHours.trim().replace(",", ".");
      if (shRaw === "") body.suggestedHours = null;
      else {
        const sh = Number.parseFloat(shRaw);
        if (Number.isFinite(sh)) body.suggestedHours = sh;
      }

      const res = await fetch(`/api/task-templates/${encodeURIComponent(templateRouteId)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      const nw = data?.wire;
      const nid = nw && typeof nw.id === "string" ? nw.id : "";
      if (nid && nid !== templateRouteId) {
        router.replace(`${routes.templates}/${encodeURIComponent(nid)}`);
        return;
      }
      await onReload();
      onSaved?.();
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "Fejl ved gem");
      throw e;
    } finally {
      onBusyChange?.(false);
    }
  }, [
    active,
    billable,
    defaultDueOffsetDays,
    defaultPriority,
    departmentKey,
    description,
    onBusyChange,
    onNotice,
    onReload,
    onSaved,
    router,
    scope,
    selectedAssignees,
    suggestedHours,
    templateRouteId,
    title,
  ]);

  useImperativeHandle(ref, () => ({ save, reset }), [reset, save]);

  const del = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slette denne skabelon permanent? Opgaver med templateId må ikke pege på den.")
    )
      return;
    onBusyChange?.(true);
    onNotice?.(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/task-templates/${encodeURIComponent(templateRouteId)}?${qs}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      router.push(routes.templates);
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "Fejl ved sletning");
    } finally {
      onBusyChange?.(false);
    }
  }, [onBusyChange, onNotice, router, templateRouteId]);

  const isInline = variant === "inline";

  return (
    <div className="tally-panel p-4 md:p-5">
      {!isInline ?
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Rediger skabelon</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={routes.templates}
              className="inline-flex h-9 items-center rounded-md border border-border px-3 font-sans text-[13px] text-fg-muted hover:bg-surface-muted"
            >
              Tilbage til skabeloner
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => reset()}
              className="h-9 rounded-md border border-border px-3 font-sans text-[13px] text-fg-muted hover:bg-surface-muted"
            >
              Nulstil
            </button>
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void save()}
              className={cn(
                "h-9 rounded-md px-4 font-sans text-[13px] font-medium text-white",
                "bg-agency-brand hover:opacity-90 disabled:opacity-40",
              )}
            >
              Gem
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void del()}
              className="h-9 rounded-md border border-agency-bad-border bg-agency-bad-soft px-3 font-sans text-[13px] font-medium text-agency-bad hover:opacity-90 disabled:opacity-40"
            >
              Slet
            </button>
          </div>
        </div>
      : (
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Rediger skabelon</h2>
      )}

      {notice ?
        <p className="mt-3 rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-2 font-sans text-[12px] text-agency-warn">
          {notice}
        </p>
      : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Titel</span>
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
          <span>Beskrivelse</span>
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
            value={departmentKey === "—" ? "" : departmentKey}
            onChange={(e) => setDepartmentKey(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          >
            {deptOptions.map((d) => (
              <option key={d.id || "none"} value={d.id}>
                {d.label}
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
          <span>Forslag timer (tom = fjern)</span>
          <input
            type="text"
            inputMode="decimal"
            value={suggestedHours}
            placeholder="Tom for at fjerne felt"
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
        <label className="flex cursor-pointer items-center gap-2 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" />{" "}
          Aktiv skabelon
        </label>
      </div>

      {isInline ?
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void del()}
            className="h-9 rounded-md border border-agency-bad-border bg-agency-bad-soft px-3 font-sans text-[13px] font-medium text-agency-bad hover:opacity-90 disabled:opacity-40"
          >
            Slet skabelon
          </button>
        </div>
      : null}
    </div>
  );
});
