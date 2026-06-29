"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { routes } from "@/config/routes";
import { sanitizeTaskUiStatus } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

/**
 * Rediger felter matcher `updateTaskMongo`/`applyDeptAssigneePatches`.
 * @param {{
 *   taskId: string;
 *   wire: Record<string, unknown>;
 *   departments: Array<{ id: string; name?: string }>;
 *   team: Array<{ id: string; name: string }>;
 *   clientsPicklist: Array<{ value: string; label: string }>;
 *   busy?: boolean;
 *   notice?: string | null;
 *   onBusyChange?: (b: boolean) => void;
 *   onNotice?: (s: string | null) => void;
 *   onReload: () => void | Promise<void>;
 * }} props
 */
export function TaskDetailMongoPanel({
  taskId,
  wire,
  departments,
  team,
  clientsPicklist,
  busy = false,
  notice,
  onBusyChange,
  onNotice,
  onReload,
}) {
  const router = useRouter();
  const [title, setTitle] = useState(String(wire.title ?? ""));
  const [hint, setHint] = useState(typeof wire.hint === "string" ? wire.hint : "");
  const [priority, setPriority] = useState(String(wire.priority ?? "medium"));
  const [status, setStatus] = useState(sanitizeTaskUiStatus(wire.status));
  const [dueDate, setDueDate] = useState(typeof wire.dueDate === "string" ? wire.dueDate.slice(0, 10) : "");
  const [departmentKey, setDepartmentKey] = useState(typeof wire.dept === "string" ? wire.dept : "");
  const [assigneeMemberKey, setAssigneeMemberKey] = useState(
    typeof wire.assigneeId === "string" ? wire.assigneeId : "",
  );
  const [clientSlug, setClientSlug] = useState(typeof wire.clientId === "string" ? wire.clientId : "");
  const [key, setKey] = useState(typeof wire.id === "string" ? wire.id : taskId);

  const reset = useCallback(() => {
    setTitle(String(wire.title ?? ""));
    setHint(typeof wire.hint === "string" ? wire.hint : "");
    setPriority(String(wire.priority ?? "medium"));
    setStatus(sanitizeTaskUiStatus(wire.status));
    setDueDate(typeof wire.dueDate === "string" ? wire.dueDate.slice(0, 10) : "");
    setDepartmentKey(typeof wire.dept === "string" ? wire.dept : "");
    setAssigneeMemberKey(typeof wire.assigneeId === "string" ? wire.assigneeId : "");
    setClientSlug(typeof wire.clientId === "string" ? wire.clientId : "");
    setKey(typeof wire.id === "string" ? wire.id : taskId);
  }, [wire, taskId]);

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
        hint,
        priority,
        status,
      };
      if (dueDate.trim()) body.dueDate = dueDate.trim().slice(0, 10);
      else body.dueDate = null;
      if (departmentKey === "" || departmentKey === "—") body.departmentKey = null;
      else body.departmentKey = departmentKey;
      if (!assigneeMemberKey.trim()) body.assigneeMemberKey = null;
      else body.assigneeMemberKey = assigneeMemberKey.trim();
      if (clientSlug.trim()) body.clientSlug = clientSlug.trim();
      const nextKey = key.trim();
      if (nextKey && nextKey !== taskId) body.key = nextKey;

      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      const nw = data?.wire;
      if (nw && typeof nw.id === "string" && nw.id !== taskId) {
        router.replace(`${routes.tasks}/${encodeURIComponent(nw.id)}`);
        return;
      }
      await onReload();
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "Fejl ved gem");
    } finally {
      onBusyChange?.(false);
    }
  }, [
    assigneeMemberKey,
    clientSlug,
    departmentKey,
    dueDate,
    hint,
    key,
    onBusyChange,
    onNotice,
    onReload,
    priority,
    router,
    status,
    taskId,
    title,
  ]);

  const del = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Slette denne opgave permanent? Handlingen kan ikke fortrydes.")
    )
      return;
    onBusyChange?.(true);
    onNotice?.(null);
    try {
      const qs = new URLSearchParams({ includeTest: "1" });
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?${qs}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      router.push(routes.tasks);
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "Fejl ved sletning");
    } finally {
      onBusyChange?.(false);
    }
  }, [onBusyChange, onNotice, router, taskId]);

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">CRM-record</h2>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <span>Kunde</span>
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
          <span>Hint</span>
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
          <span>Forfaldsdato</span>
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
          <span>Nøgle (kan omdøbe URL)</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={cn(
              "rounded-md border border-border bg-surface-muted px-3 py-2 text-[12px] text-fg",
              "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            )}
          />
        </label>
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
    </div>
  );
}
