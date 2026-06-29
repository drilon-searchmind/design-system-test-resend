"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * PATCH/DELETE matcher `updateTaskTemplateMongo` / API.
 *
 * @param {{
 *   templateRouteId: string;
 *   wire: Record<string, unknown>;
 *   departments: Array<{ id: string; name?: string }>;
 *   busy?: boolean;
 *   notice?: string | null;
 *   onBusyChange?: (b: boolean) => void;
 *   onNotice?: (s: string | null) => void;
 *   onReload: () => void | Promise<void>;
 * }} props
 */
export function TemplateDetailMongoPanel({
  templateRouteId,
  wire,
  departments,
  busy = false,
  notice,
  onBusyChange,
  onNotice,
  onReload,
}) {
  const router = useRouter();
  const [title, setTitle] = useState(String(wire.name ?? ""));
  const [description, setDescription] = useState(typeof wire.hint === "string" ? wire.hint : "");
  const [key, setKey] = useState(typeof wire.id === "string" ? wire.id : templateRouteId);
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
  const [checklistText, setChecklistText] = useState(
    Array.isArray(wire.checklist) ? wire.checklist.map((x) => String(x)).join("\n") : "",
  );
  const [active, setActive] = useState(wire.active !== false);

  const reset = useCallback(() => {
    setTitle(String(wire.name ?? ""));
    setDescription(typeof wire.hint === "string" ? wire.hint : "");
    setKey(typeof wire.id === "string" ? wire.id : templateRouteId);
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
    setChecklistText(Array.isArray(wire.checklist) ? wire.checklist.map((x) => String(x)).join("\n") : "");
    setActive(wire.active !== false);
  }, [wire, templateRouteId]);

  const deptOptions = useMemo(() => [{ id: "", label: "—" }, ...departments.map((d) => ({ id: d.id, label: d.name ?? d.id }))], [
    departments,
  ]);

  useEffect(() => {
    queueMicrotask(() => reset());
  }, [reset]);

  const save = useCallback(async () => {
    onBusyChange?.(true);
    onNotice?.(null);
    try {
      const qs = new URLSearchParams({ includeTest: "1" });
      /** @type {Record<string, unknown>} */
      const body = {
        title: title.trim(),
        description,
        defaultPriority,
        scope,
        active,
        checklistText,
      };
      const nextKey = key.trim();
      if (nextKey && nextKey !== templateRouteId) body.key = nextKey;
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
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "Fejl ved gem");
    } finally {
      onBusyChange?.(false);
    }
  }, [
    active,
    checklistText,
    defaultDueOffsetDays,
    defaultPriority,
    departmentKey,
    description,
    key,
    onBusyChange,
    onNotice,
    onReload,
    router,
    scope,
    suggestedHours,
    templateRouteId,
    title,
  ]);

  const del = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slette denne skabelon permanent? Opgaver med templateId må ikke pege på den.")
    )
      return;
    onBusyChange?.(true);
    onNotice?.(null);
    try {
      const qs = new URLSearchParams({ includeTest: "1" });
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

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Mongo-record</h2>
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
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
          <span>Stabil nøgle (URL)</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 text-[12px] text-fg",
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
          <span>Scope</span>
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
            placeholder="Tom for at unsette felt"
            onChange={(e) => setSuggestedHours(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" />{" "}
          Aktiv
        </label>
        <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted sm:col-span-2">
          <span>Tjekliste (ét pr. linje)</span>
          <textarea
            rows={6}
            value={checklistText}
            onChange={(e) => setChecklistText(e.target.value)}
            className={cn(
              "resize-y rounded-md border border-border bg-surface-muted px-3 py-2 font-sans text-[13px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
      </div>
    </div>
  );
}
