"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { routes } from "@/config/routes";
import { getTimeEntryDemoDetail } from "@/lib/crm/time-entries-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/** @typedef {"detaljer" | "aktivitet"} TabId */

/** @param {string | undefined} iso */
function workedParts(iso) {
  const s = typeof iso === "string" ? iso.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return { d: "", t: "" };
  return { d: s.slice(0, 10), t: `${s.slice(11, 13)}:${s.slice(14, 16)}` };
}

/**
 * @param {{ entryId: string; dataSource: string }} p
 */
export function TimeEntryDetailShell({ entryId, dataSource }) {
  const router = useRouter();
  const db = dataSource === "database";
  const [tab, setTab] = useState(/** @type {TabId} */ ("detaljer"));

  const [bundle, setBundle] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dur, setDur] = useState("");
  const [desc, setDesc] = useState("");
  const [billable, setBillable] = useState(true);
  const [clientSlug, setClientSlug] = useState("");
  const [departmentKey, setDepartmentKey] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [workedDate, setWorkedDate] = useState("");
  const [workedTime, setWorkedTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const fillFromWire = useCallback((wire) => {
    const row = typeof wire === "object" && wire !== null ? wire : {};
    const p = workedParts(typeof row.workedAtIso === "string" ? row.workedAtIso : undefined);
    setWorkedDate(p.d || "");
    setWorkedTime(p.t || "");
    const n = typeof row.durationMinutes === "number" ? row.durationMinutes : Number(row.durationMinutes);
    setDur(Number.isFinite(n) ? String(Math.round(n)) : "");
    setDesc(typeof row.desc === "string" ? row.desc : "");
    setBillable(row.billable !== false);
    const cs = typeof row.clientSlug === "string" ? row.clientSlug.trim() : "";
    setClientSlug(cs);
    const dk = typeof row.dept === "string" ? row.dept.trim() : "";
    setDepartmentKey(dk);
    const tk = typeof row.taskKey === "string" ? row.taskKey.trim() : "";
    setTaskKey(tk);
  }, []);

  const loadBundle = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);

    try {
      if (!db) {
        const demo = getTimeEntryDemoDetail(entryId);
        if (!demo) {
          setBundle(null);
          setLoadErr("Ikke fundet.");
          return;
        }
        setBundle(demo);
        fillFromWire(demo.entry);
        return;
      }

      const qs = databaseApiQuery();
      const res = await fetch(`/api/time-entries/${encodeURIComponent(entryId)}?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || (typeof data.error === "string" && data.error.length)) {
        setBundle(null);
        setLoadErr(typeof data.error === "string" ? data.error : "Kunne ikke hente.");
        return;
      }

      setBundle(data);
      fillFromWire(data.entry ?? {});
    } finally {
      setLoading(false);
    }
  }, [db, entryId, fillFromWire]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadBundle();
    });
  }, [loadBundle]);

  const departments =
    bundle && typeof bundle === "object" && Array.isArray(bundle.departments) ? bundle.departments : [];
  const clientsPick =
    bundle && typeof bundle === "object" && Array.isArray(bundle.clientsPicklist) ? bundle.clientsPicklist : [];

  /** @typedef {{ value: string; label: string; clientSlug?: string }} TaskOpt */
  const tasksPickRaw =
    bundle && typeof bundle === "object" && Array.isArray(bundle.tasksPicklist) ? bundle.tasksPicklist : [];
  /** @type {TaskOpt[]} */
  const tasksPick = tasksPickRaw;

  const filteredTasks = useMemo(() => {
    if (!billable || !clientSlug.trim()) return tasksPick;
    const cs = clientSlug.trim();
    return tasksPick.filter((t) => {
      const tcs = typeof t.clientSlug === "string" ? t.clientSlug.trim() : "";
      return !tcs || tcs === cs;
    });
  }, [billable, clientSlug, tasksPick]);

  const activityEntries =
    bundle && typeof bundle === "object" && Array.isArray(bundle.activityEntries) ? bundle.activityEntries : [];

  const entryWire =
    bundle && typeof bundle === "object" && bundle.entry && typeof bundle.entry === "object" ?
      bundle.entry
    : /** @type {Record<string, unknown>} */ ({});
  const mongoIdTxt =
    typeof entryWire.mongoId === "string" && entryWire.mongoId.trim() ?
      String(entryWire.mongoId).trim()
    : "";
  const fallbackIdTxt = typeof entryWire.id === "string" ? String(entryWire.id) : "";

  const save = useCallback(async () => {
    if (!db) return;
    setBusy(true);
    setBanner(null);
    try {
      const mins = Number.parseInt(String(dur).trim(), 10);
      if (!Number.isFinite(mins) || mins <= 0) {
        setBanner("Angiv gyldigt antal minutter.");
        return;
      }

      const body = {
        durationMinutes: mins,
        description: desc,
        billable,
        workedDate,
        workedTime,
        departmentKey: departmentKey.trim(),
        taskKey: taskKey.trim(),
      };
      if (billable && clientSlug.trim()) body.clientSlug = clientSlug.trim();
      const targetId = mongoIdTxt || fallbackIdTxt || entryId;
      const qs = databaseApiQuery();
      const res = await fetch(`/api/time-entries/${encodeURIComponent(targetId)}?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || (typeof data.error === "string" && data.error))
        throw new Error(typeof data.error === "string" ? data.error : "Kunne ikke gemme");
      if (data?.wire && typeof data.wire === "object") fillFromWire(data.wire);
      else await loadBundle();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Fejl ved gem.");
    } finally {
      setBusy(false);
    }
  }, [
    billable,
    clientSlug,
    db,
    desc,
    departmentKey,
    dur,
    entryId,
    fallbackIdTxt,
    fillFromWire,
    loadBundle,
    mongoIdTxt,
    taskKey,
    workedDate,
    workedTime,
  ]);

  const remove = useCallback(async () => {
    if (!db) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("Slette denne registrering?");
      if (!ok) return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const targetId = mongoIdTxt || fallbackIdTxt || entryId;
      const qs = databaseApiQuery();
      const res = await fetch(`/api/time-entries/${encodeURIComponent(targetId)}?${qs}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (typeof data.error === "string" && data.error))
        throw new Error(typeof data.error === "string" ? data.error : "Kunne ikke slette");
      router.push(routes.time);
      router.refresh();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Fejl ved sletning.");
    } finally {
      setBusy(false);
    }
  }, [db, entryId, fallbackIdTxt, mongoIdTxt, router]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-skeleton" />
        <div className="h-64 animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (loadErr || !bundle) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-[13px] text-fg-muted">
          {loadErr ?? "Mangler registrering."}{" "}
          <Link href={routes.time} className="text-agency-brand hover:underline">
            Tilbage til tidsregistrering
          </Link>
          .
        </p>
      </div>
    );
  }


  const headerAt =
    typeof entryWire.at === "string"
      ?
        entryWire.at
      :
        typeof entryWire.workedAtIso === "string" ?
          entryWire.workedAtIso.slice(11, 16)
        : "";

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="min-w-0">
          <Link
            href={routes.time}
            className="text-[10px] font-semibold uppercase tracking-wide text-agency-brand hover:underline"
          >
            Tilbage
          </Link>
          <h1 className="mt-1 font-sans text-[20px] font-semibold text-fg">Tidsregistrering</h1>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            {`${dur || "—"} min`} kl. <span className="tabular-nums text-fg">{headerAt}</span>
            {" · "}
            {db ? "Live data" : "Eksempelvisning"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {db ?
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className={cn(
                  "inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand px-3",
                  "font-sans text-[11px] font-semibold text-white hover:bg-agency-brand/90 disabled:opacity-40",
                )}
              >
                Gem
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="inline-flex h-8 items-center rounded-md border border-agency-bad-border bg-agency-bad-soft px-3 font-sans text-[11px] font-semibold text-agency-bad hover:opacity-90 disabled:opacity-40"
              >
                Slet
              </button>
            </>
          : null}
        </div>
      </div>

      {typeof banner === "string" && banner.trim().length ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {banner}
        </p>
      : null}

      <PulseSegmentedControl
        size="sm"
        active={tab}
        onChange={(id) => setTab(id === "aktivitet" ? "aktivitet" : "detaljer")}
        tabs={[
          { id: "detaljer", label: "Detaljer" },
          { id: "aktivitet", label: "Aktivitet" },
        ]}
      />

      {tab === "aktivitet" ?
        <ul className="space-y-2 rounded-2xl border border-border-soft bg-surface-muted/35 p-3">
          {activityEntries.map((ev, idx) =>
            ev && typeof ev === "object" ?
              <li key={typeof ev.id === "string" && ev.id.trim() ? ev.id : String(idx)} className="font-sans text-[12px] text-fg-muted">
                <span className="tabular-nums text-fg-quiet">{typeof ev.at === "string" ? ev.at.replace("T", " ").slice(0, 16) : ""}</span>
                {" — "}
                <span className="font-semibold text-fg">{typeof ev.kind === "string" ? ev.kind : "Hændelse"}</span>
                {" · "}
                {typeof ev.summary === "string" ? ev.summary : ""}
              </li>
            : null,
          )}
        </ul>
      : (
        <div className="tally-panel grid gap-4 p-4 md:grid-cols-2 md:p-5">
          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Minutter</span>
            <input
              disabled={!db}
              type="number"
              min={1}
              step={1}
              value={dur}
              onChange={(ev) => setDur(ev.target.value)}
              className={cn(
                "h-9 rounded-md border border-border bg-surface-muted px-2 text-[13px] tabular-nums",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                !db && "opacity-65",
              )}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Dato arbejde</span>
            <input
              disabled={!db}
              type="date"
              value={workedDate}
              onChange={(ev) => setWorkedDate(ev.target.value.slice(0, 10))}
              className={cn(
                "h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px]",
                !db && "opacity-65",
              )}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Kl.</span>
            <input
              disabled={!db}
              type="time"
              value={workedTime}
              onChange={(ev) => setWorkedTime(ev.target.value.slice(0, 5))}
              className={cn(
                "h-9 rounded-md border border-border bg-surface-muted px-2 text-[13px]",
                !db && "opacity-65",
              )}
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Note</span>
            <textarea
              disabled={!db}
              value={desc}
              onChange={(ev) => setDesc(ev.target.value)}
              rows={3}
              className={cn(
                "rounded-md border border-border bg-surface-muted p-2 font-sans text-[13px]",
                !db && "opacity-65",
              )}
            />
          </label>

          <label className="flex items-center gap-2 font-sans text-[13px] md:col-span-2">
            <input
              disabled={!db}
              type="checkbox"
              checked={billable}
              onChange={(ev) => {
                const nx = ev.target.checked;
                setBillable(nx);
                if (!nx) setTaskKey("");
              }}
              className="accent-agency-brand"
            />
            Billable
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Kunde</span>
            <select
              disabled={!db || !billable}
              value={billable ? clientSlug : ""}
              onChange={(ev) => {
                setClientSlug(ev.target.value);
                setTaskKey("");
              }}
              className={cn("h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px]", !db && "opacity-65")}
            >
              <option value="">—</option>
              {clientsPick.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Afdeling</span>
            <select
              disabled={!db}
              value={departmentKey}
              onChange={(ev) => setDepartmentKey(ev.target.value)}
              className={cn("h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px]", !db && "opacity-65")}
            >
              <option value="">—</option>
              {departments.map((row) =>
                typeof row.id === "string" ?
                  <option key={row.id} value={row.id}>
                    {typeof row.name === "string" ? row.name : row.id}
                  </option>
                : null,
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Opgave</span>
            <select
              disabled={!db || !billable}
              value={taskKey}
              onChange={(ev) => setTaskKey(ev.target.value)}
              className={cn("h-9 rounded-md border border-border bg-surface-muted px-2 font-sans text-[13px]", !db && "opacity-65")}
            >
              <option value="">—</option>
              {filteredTasks.map((t) => (
                <option key={`${t.value}`} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {!db ?
            <p className="md:col-span-2 font-sans text-[12px] text-fg-muted">
              Redigering er ikke tilgængelig.
            </p>
          : null}
        </div>
      )}
    </div>
  );
}
