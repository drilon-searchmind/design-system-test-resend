"use client";

import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

function isoTodayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dd}`;
}

export function TimeEntryCreateForm({
  departments = [],
  clientsPicklist = [],
  tasksPicklist = [],
  submitting,
  error,
  onSubmit,
  onCancel,
  variant = "card",
}) {
  const [workedDate, setWorkedDate] = useState(isoTodayLocal);
  const [workedTime, setWorkedTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [billable, setBillable] = useState(true);
  const [clientSlug, setClientSlug] = useState(typeof clientsPicklist[0]?.value === "string" ? clientsPicklist[0].value : "");
  const [departmentKey, setDepartmentKey] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [description, setDescription] = useState("");

  const filteredTasks = useMemo(() => {
    const list = Array.isArray(tasksPicklist) ? tasksPicklist : [];
    const cs = clientSlug.trim();
    if (!billable || !cs) return list;
    return list.filter((t) => {
      const tcs = typeof t.clientSlug === "string" ? t.clientSlug.trim() : "";
      return !tcs || tcs === cs;
    });
  }, [billable, clientSlug, tasksPicklist]);

  const submit = useCallback(() => {
    const mins = Number.parseInt(String(durationMinutes).trim(), 10);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const body = {};
    body.workedDate = workedDate;
    if (workedTime.trim()) body.workedTime = workedTime.trim();
    body.durationMinutes = mins;
    body.description = typeof description === "string" ? description : "";
    if (!billable) body.billable = false;
    if (billable && clientSlug.trim()) body.clientSlug = clientSlug.trim();
    const dk = departmentKey.trim();
    if (dk && dk !== "\u2014") body.departmentKey = dk;
    const tk = taskKey.trim();
    if (tk) body.taskKey = tk;
    onSubmit(body);
  }, [
    billable,
    clientSlug,
    departmentKey,
    description,
    durationMinutes,
    onSubmit,
    taskKey,
    workedDate,
    workedTime,
  ]);


  return (
    <div className="flex flex-col gap-4">
      {typeof error === "string" && error.trim() ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Dato</span>
        <input
          type="date"
          value={workedDate}
          onChange={(ev) => setWorkedDate(ev.target.value.slice(0, 10))}
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Kl. (valgfri)</span>
        <input
          type="time"
          value={workedTime}
          onChange={(ev) => setWorkedTime(ev.target.value.slice(0, 5))}
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Minutter</span>
        <input
          type="number"
          min={1}
          step={1}
          value={durationMinutes}
          onChange={(ev) => setDurationMinutes(ev.target.value)}
          placeholder="fx 45"
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 text-[13px] text-fg tabular-nums",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      </label>

      <label className="flex items-center gap-2 font-sans text-[13px] text-fg">
        <input
          type="checkbox"
          checked={billable}
          onChange={(ev) => {
            const next = ev.target.checked;
            setBillable(next);
            if (!next) setTaskKey("");
          }}
          className="accent-agency-brand"
        />
        Billable (kræver kunde)
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Kunde</span>
        <select
          disabled={!billable}
          value={billable ? clientSlug : ""}
          onChange={(ev) => {
            setClientSlug(ev.target.value);
            setTaskKey("");
          }}
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            !billable && "cursor-not-allowed opacity-55",
          )}
        >
          <option value="">Vælg kunde…</option>
          {clientsPicklist.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Afdeling</span>
        <select
          value={departmentKey}
          onChange={(ev) => setDepartmentKey(ev.target.value)}
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        >
          <option value="">—</option>
          {departments.map((d) => {
            const id = typeof d.id === "string" ? d.id : "";
            if (!id) return null;
            const name = typeof d.name === "string" ? d.name : id;
            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Opgave (valgfri)</span>
        <select
          value={taskKey}
          disabled={!billable}
          onChange={(ev) => setTaskKey(ev.target.value)}
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
            !billable && "cursor-not-allowed opacity-55",
          )}
        >
          <option value="">—</option>
          {filteredTasks.map((t) => (
            <option key={t.value || t.label} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Note</span>
        <input
          type="text"
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          placeholder="Hvad blev der leveret?"
          className={cn(
            "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px] text-fg",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={Boolean(submitting)}
          onClick={submit}
          className={cn(
            "inline-flex h-9 items-center rounded-md border border-agency-brand-border bg-agency-brand px-4",
            "font-sans text-[12px] font-semibold text-white transition-colors hover:bg-agency-brand/90 disabled:opacity-45",
          )}
        >
          {submitting ? "Gemmer…" : "Gem"}
        </button>
        {variant === "modal" ?
          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => (typeof onCancel === "function" ? onCancel() : undefined)}
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-muted px-4 font-sans text-[12px] font-medium text-fg-muted hover:border-agency-brand-border hover:text-agency-brand disabled:opacity-45"
          >
            Annullér
          </button>
        : null}
      </div>
    </div>
  );
}
