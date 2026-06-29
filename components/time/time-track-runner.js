"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
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

export function TimeTrackRunner() {
  const [clientSlug, setClientSlug] = useState(CLIENTS[0]?.id ?? "");
  const [taskKey, setTaskKey] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState("yes");
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(/** @type {string | null} */ (null));
  const [tick, setTick] = useState(0);

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
      emitTimerSessionChanged();
    } catch {
      setBanner("Netværksfejl");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const tasksForClient = useMemo(
    () => TASKS.filter((t) => t.clientId === clientSlug).sort((a, b) => a.title.localeCompare(b.title, "da")),
    [clientSlug],
  );

  const secs = elapsedSeconds(active?.startedAt ?? null);
  void tick;

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

  const running = Boolean(active?.startedAt);

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <section className={tallyPanelOverflow}>
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
            {running ? (
              <div className="flex flex-wrap items-center justify-center gap-2 font-sans text-[13px] text-fg-muted">
                <span className="font-semibold text-fg">{active?.clientName}</span>
                {active?.taskKey ? (
                  <>
                    <span className="text-fg-quiet">·</span>
                    <span className="max-w-[min(440px,80vw)] truncate">{active?.taskTitle}</span>
                  </>
                ) : (
                  <span className="text-fg-quiet">· ingen opgave</span>
                )}
              </div>
            ) : (
              <p className="font-sans text-[13px] text-fg-muted">Ingen timer kører — vælg kunde og start.</p>
            )}
          </div>
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-3">
            {running ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStop()}
                className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-full border border-agency-bad-border bg-agency-bad-soft px-6 text-sm font-semibold text-agency-bad transition-colors hover:bg-agency-bad-soft/80 disabled:opacity-50"
              >
                Stop & gem
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || !clientSlug}
                onClick={(e) => void handleStart(e)}
                className={cn(tallyBtnBrand, "h-11 min-w-[140px]")}
              >
                Start timer
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-5 p-4 md:grid-cols-2 md:gap-6 md:p-8">
          <fieldset className="contents" disabled={running || busy}>
            {banner ? (
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted md:col-span-2">
                {banner}
              </div>
            ) : null}

            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                Kunde <span className="text-agency-brand">*</span>
              </span>
              <div className="relative">
                <select
                  value={clientSlug}
                  onChange={(e) => {
                    setClientSlug(e.target.value);
                    setTaskKey("");
                  }}
                  className={tallySelect}
                >
                  {CLIENTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
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
                >
                  <option value="">— Kun kunden (ingen opgave) —</option>
                  {tasksForClient.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
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
          </fieldset>
        </div>
      </section>
    </div>
  );
}
