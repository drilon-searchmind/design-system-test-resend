"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { emitTimerSessionChanged } from "@/lib/crm/timer-session-events";
import { CLIENTS, TASKS } from "@/lib/crm/static-data";
import { tallyBtnBrand, tallyPanelOverflow, tallySelect } from "@/lib/ui/tally-chrome";
import { cn } from "@/lib/utils";

function elapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function formatHms(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

function isoTodayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dd}`;
}

/** @param {string} raw */
function parseDurationMinutes(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number.parseInt(s, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const hourMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:t|time|timer|h|hr|hours?)$/);
  if (hourMatch) {
    const h = Number.parseFloat(hourMatch[1].replace(",", "."));
    if (Number.isFinite(h) && h > 0) return Math.round(h * 60);
  }

  const minMatch = s.match(/^(\d+)\s*(?:m|min|mins?|minutter?)$/);
  if (minMatch) {
    const m = Number.parseInt(minMatch[1], 10);
    if (Number.isFinite(m) && m > 0) return m;
  }

  const combo = s.match(/^(\d+)\s*(?:t|time|timer|h)\s*(\d+)\s*(?:m|min)?$/);
  if (combo) {
    const h = Number.parseInt(combo[1], 10);
    const m = Number.parseInt(combo[2], 10);
    if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && m > 0) return h * 60 + m;
  }

  return null;
}

const MANUAL_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 time", minutes: 60 },
  { label: "1,5 time", minutes: 90 },
  { label: "2 timer", minutes: 120 },
];

/** @typedef {{ value: string; label: string; clientSlug?: string }} TaskPick */

export function TimeTrackRunner() {
  const dataSource = useDataSource();
  const isDb = dataSource === "database";

  const [trackMode, setTrackMode] = useState("timer");
  const [clientSlug, setClientSlug] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState("yes");
  const [workedDate, setWorkedDate] = useState(isoTodayLocal);
  const [durationInput, setDurationInput] = useState("");
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(/** @type {string | null} */ (null));
  const [tick, setTick] = useState(0);
  const [clientsPick, setClientsPick] = useState(/** @type {{ value: string; label: string }[]} */ ([]));
  const [tasksPick, setTasksPick] = useState(/** @type {TaskPick[]} */ ([]));
  const [canStartTimer, setCanStartTimer] = useState(true);

  useEffect(() => {
    if (!isDb) {
      setClientSlug(CLIENTS[0]?.id ?? "");
      setTaskKey("");
    }
  }, [isDb]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setActive(null);
        setBanner(typeof data?.error === "string" ? data.error : "Kunne ikke hente timer");
        emitTimerSessionChanged();
        return;
      }
      setBanner(null);
      setActive(data.active ?? null);
      setCanStartTimer(data.canStartTimer !== false);

      if (isDb) {
        const cp = Array.isArray(data.clientsPicklist) ? data.clientsPicklist : [];
        const tp = Array.isArray(data.tasksPicklist) ? data.tasksPicklist : [];
        setClientsPick(cp);
        setTasksPick(tp);
        setClientSlug((prev) => {
          if (prev && cp.some((c) => c.value === prev)) return prev;
          return cp[0]?.value ?? "";
        });
      }

      emitTimerSessionChanged();
    } catch {
      setBanner("Netværksfejl");
    }
  }, [isDb]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const clientOptions = useMemo(() => {
    if (isDb) return clientsPick;
    return CLIENTS.map((c) => ({ value: c.id, label: c.name }));
  }, [isDb, clientsPick]);

  const tasksForClient = useMemo(() => {
    if (isDb) {
      return tasksPick
        .filter((t) => !clientSlug || !t.clientSlug || t.clientSlug === clientSlug)
        .sort((a, b) => a.label.localeCompare(b.label, "da"));
    }
    return TASKS.filter((t) => t.clientId === clientSlug).sort((a, b) =>
      a.title.localeCompare(b.title, "da"),
    );
  }, [isDb, clientSlug, tasksPick]);

  const secs = elapsedSeconds(active?.startedAt ?? null);
  void tick;

  const running = Boolean(active?.startedAt);
  const noClients = clientOptions.length === 0;
  const startBlocked = !canStartTimer || noClients;
  const manualMode = trackMode === "manual";
  const parsedMinutes = useMemo(() => parseDurationMinutes(durationInput), [durationInput]);

  async function handleStart(e) {
    e.preventDefault();
    if (!clientSlug) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          clientSlug,
          taskKey: taskKey || undefined,
          description,
          billable: billable === "yes",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner(data?.error ?? "Kunne ikke starte");
        return;
      }
      setActive(data.active ?? null);
      emitTimerSessionChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner(data?.error ?? "Kunne ikke stoppe");
        return;
      }
      setActive(null);
      emitTimerSessionChanged();
      setBanner(`Gemt · ${data.durationMinutes ?? "?"} min`);
      setTimeout(() => setBanner(null), 4500);
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSave(e) {
    e.preventDefault();
    if (!isDb) {
      setBanner("Manuel tid kræver Database-tilstand");
      return;
    }
    if (!canStartTimer) {
      setBanner("Log ind for at registrere tid");
      return;
    }
    if (billable === "yes" && !clientSlug) {
      setBanner("Vælg kunde");
      return;
    }
    const mins = parsedMinutes;
    if (!mins || mins <= 0) {
      setBanner("Angiv varighed — fx 30, 60 eller «1 time»");
      return;
    }

    setBusy(true);
    setBanner(null);
    try {
      /** @type {Record<string, unknown>} */
      const body = {
        workedDate,
        durationMinutes: mins,
        description,
        billable: billable === "yes",
      };
      if (billable === "yes" && clientSlug) body.clientSlug = clientSlug;
      if (taskKey) body.taskKey = taskKey;

      const qs = databaseApiQuery();
      const res = await fetch(`/api/time-entries?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");
        return;
      }
      emitTimerSessionChanged();
      setDurationInput("");
      setBanner(`Gemt · ${mins} min`);
      setTimeout(() => setBanner(null), 4500);
    } catch {
      setBanner("Netværksfejl");
    } finally {
      setBusy(false);
    }
  }

  const formDisabled = running || busy;

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Tilstand</p>
        <PulseSegmentedControl
          size="sm"
          active={trackMode}
          onChange={(id) => {
            if (running) return;
            setTrackMode(id);
            setBanner(null);
          }}
          tabs={[
            { id: "timer", label: "Timer" },
            { id: "manual", label: "Manuel tid" },
          ]}
        />
      </div>

      <section className={tallyPanelOverflow}>
        {manualMode ?
          <div className="border-b border-border bg-surface-muted px-4 py-6 md:px-8 md:py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.1em] text-fg-soft">Manuel registrering</p>
              <p className="font-sans text-[13px] text-fg-muted">
                Angiv varighed uden at starte timer — fx 30 minutter eller 1 time.
              </p>
            </div>
          </div>
        : (
          <div className="border-b border-border bg-surface-muted px-4 py-6 md:px-8 md:py-10">
            <div className="flex flex-col items-center gap-2 text-center md:gap-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-fg-soft">Aktiv tid</p>
              <p
                className={cn(
                  "text-[48px] font-semibold leading-none tabular-nums tracking-tight md:text-[56px]",
                  running ? "text-agency-brand" : "text-fg-quiet",
                )}
              >
                {formatHms(secs)}
              </p>
              {running ?
                <div className="flex flex-wrap items-center justify-center gap-2 font-sans text-[13px] text-fg-muted">
                  <span className="font-semibold text-fg">{active?.clientName}</span>
                  {active?.taskTitle ?
                    <>
                      <span className="text-fg-quiet">·</span>
                      <span className="max-w-[min(440px,80vw)] truncate">{active?.taskTitle}</span>
                    </>
                  : (
                    <span className="text-fg-quiet">· ingen opgave</span>
                  )}
                </div>
              : (
                <p className="font-sans text-[13px] text-fg-muted">Ingen timer kører — vælg kunde og start.</p>
              )}
            </div>
            <div className="mx-auto mt-8 flex flex-wrap justify-center gap-3">
              {running ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStop()}
                  className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-full border border-agency-bad-border bg-agency-bad-soft px-6 text-sm font-semibold text-agency-bad transition-colors hover:bg-agency-bad-soft/80 disabled:opacity-50"
                >
                  Stop & gem
                </button>
              : (
                <button
                  type="button"
                  disabled={busy || !clientSlug || startBlocked}
                  onClick={(e) => void handleStart(e)}
                  className={cn(tallyBtnBrand, "h-11 min-w-[140px]")}
                >
                  Start timer
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-5 p-4 md:grid-cols-2 md:gap-6 md:p-8">
          <fieldset className="contents" disabled={formDisabled}>
            {banner ?
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted md:col-span-2">
                {banner}
              </div>
            : null}

            {manualMode && !isDb ?
              <p className="font-sans text-[12px] text-fg-muted md:col-span-2">
                Manuel registrering er kun tilgængelig i Database-tilstand.
              </p>
            : null}

            {isDb && !canStartTimer && !running ?
              <p className="font-sans text-[12px] text-fg-muted md:col-span-2">
                Log ind med en provisioneret Google-konto for at registrere tid.
              </p>
            : null}

            {isDb && canStartTimer && noClients && !running && billable === "yes" ?
              <p className="font-sans text-[12px] text-fg-muted md:col-span-2">
                Ingen kunder i databasen endnu — importér kunder før du registrerer billable tid.
              </p>
            : null}

            {manualMode && isDb ?
              <>
                <label className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Dato</span>
                  <input
                    type="date"
                    value={workedDate}
                    onChange={(e) => setWorkedDate(e.target.value.slice(0, 10))}
                    className={cn(
                      "h-10 rounded-xl border border-border bg-surface-muted px-3",
                      "text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                    )}
                  />
                </label>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Varighed</span>
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_PRESETS.map((p) => (
                      <button
                        key={p.minutes}
                        type="button"
                        onClick={() => setDurationInput(String(p.minutes))}
                        className={cn(
                          "inline-flex h-8 items-center rounded-md border px-3 font-sans text-[12px] font-medium transition-colors",
                          parsedMinutes === p.minutes ?
                            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                          : "border-border bg-surface-muted text-fg-muted hover:border-agency-brand-border hover:text-fg",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    placeholder="Eller skriv minutter — fx 45, 60, «1 time»"
                    className={cn(
                      "h-10 rounded-xl border border-border bg-surface-muted px-3",
                      "text-sm text-fg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                    )}
                  />
                  {parsedMinutes ?
                    <span className="font-sans text-[11px] text-fg-quiet">
                      = {parsedMinutes} min
                      {parsedMinutes >= 60 ?
                        ` (${Math.floor(parsedMinutes / 60)} t${parsedMinutes % 60 ? ` ${parsedMinutes % 60} min` : ""})`
                      : null}
                    </span>
                  : durationInput.trim() ?
                    <span className="font-sans text-[11px] text-agency-warn">Kunne ikke læse varighed — prøv fx 30 eller 1 time</span>
                  : null}
                </div>
              </>
            : null}

            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                Kunde {billable === "yes" ? <span className="text-agency-brand">*</span> : null}
              </span>
              <div className="relative">
                <select
                  value={clientSlug}
                  onChange={(e) => {
                    setClientSlug(e.target.value);
                    setTaskKey("");
                  }}
                  className={tallySelect}
                  disabled={noClients || (manualMode && billable === "no")}
                >
                  {noClients ?
                    <option value="">— Ingen kunder —</option>
                  : clientOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))
                  }
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-quiet">
                  <PulseIconChevronDown size={12} />
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Opgave</span>
              <div className="relative">
                <select
                  value={taskKey}
                  onChange={(e) => setTaskKey(e.target.value)}
                  className={tallySelect}
                  disabled={noClients && billable === "yes"}
                >
                  <option value="">— Kun kunden (ingen opgave) —</option>
                  {isDb ?
                    tasksForClient.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))
                  : tasksForClient.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))
                  }
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-quiet">
                  <PulseIconChevronDown size={12} />
                </span>
              </div>
              <span className="font-sans text-[11px] text-fg-quiet">
                Valgfrit — filtreres efter valgt kunde.
              </span>
            </label>

            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Note</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Fx «Teknisk SEO — indeksering»"
                className={cn(
                  "w-full resize-y rounded-xl border border-border bg-surface-muted px-3 py-2",
                  "text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                )}
              />
            </label>

            <div className="md:col-span-2">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                Fakturerbar
              </span>
              <PulseSegmentedControl
                size="sm"
                active={billable}
                onChange={setBillable}
                tabs={[
                  { id: "yes", label: "Ja" },
                  { id: "no", label: "Intern" },
                ]}
              />
            </div>

            {manualMode && isDb ?
              <div className="md:col-span-2">
                <button
                  type="button"
                  disabled={busy || !canStartTimer || (billable === "yes" && !clientSlug) || !parsedMinutes}
                  onClick={(e) => void handleManualSave(e)}
                  className={cn(tallyBtnBrand, "h-11 w-full sm:w-auto sm:min-w-[160px]")}
                >
                  {busy ? "Gemmer…" : "Gem tid"}
                </button>
              </div>
            : null}
          </fieldset>
        </div>
      </section>
    </div>
  );
}
