"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { memberProfileHref, routes } from "@/config/routes";
import { normalizeDeptKey } from "@/lib/crm/dept-keys";
import { cn } from "@/lib/utils";

const LIST_LIMIT = 6;

/**
 * @param {{
 *   teamRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 *   departments: Array<{ id: string; name: string }>;
 *   dataSource: string;
 * }} props
 */
export function TeamCapacityWatchCard({ teamRows, departments, dataSource }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const isDatabase = dataSource !== "demo";

  const [mode, setMode] = useState("low");
  const [dbExcluded, setDbExcluded] = useState(/** @type {string[]} */ ([]));
  const [demoExcluded, setDemoExcluded] = useState(/** @type {string[]} */ ([]));
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null));
  const excluded = isDatabase ? dbExcluded : demoExcluded;
  const setExcluded = isDatabase ? setDbExcluded : setDemoExcluded;

  useEffect(() => {
    if (!isDatabase) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings/agency", { cache: "no-store" });
        const data = await res.json();
        const keys = data?.settings?.teamLowUtilExcludedDepartments;
        if (!cancelled && res.ok && Array.isArray(keys)) setDbExcluded(keys.map(String));
      } catch {
        /* behold ingen udelukkelser */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDatabase]);

  const excludedSet = useMemo(() => new Set(excluded.map(normalizeDeptKey)), [excluded]);

  const rows = useMemo(() => {
    if (mode === "high") return teamRows.toSorted((a, b) => b.loadIndex - a.loadIndex).slice(0, LIST_LIMIT);
    return teamRows
      .filter((r) => !excludedSet.has(normalizeDeptKey(String(r.member.dept ?? ""))))
      .toSorted((a, b) => a.loadIndex - b.loadIndex)
      .slice(0, LIST_LIMIT);
  }, [mode, teamRows, excludedSet]);

  const deptOptions = useMemo(() => {
    const known = departments.map((d) => ({ id: d.id, name: d.name }));
    const extra = excluded
      .filter((k) => !known.some((d) => normalizeDeptKey(d.id) === normalizeDeptKey(k)))
      .map((k) => ({ id: k, name: k }));
    return [...known, ...extra];
  }, [departments, excluded]);

  /** @param {string[]} next */
  async function updateExcluded(next) {
    const previous = excluded;
    setExcluded(next);
    setSaveError(null);
    if (!isDatabase) return;
    try {
      const res = await fetch("/api/settings/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamLowUtilExcludedDepartments: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");
    } catch (err) {
      setExcluded(previous);
      setSaveError(err instanceof Error ? err.message : "Kunne ikke gemme");
    }
  }

  const hiddenCount = mode === "low" ? excludedSet.size : 0;

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            {mode === "low" ? "Profiler med mindst belægning" : "Profiler med højest belægning"}
          </h2>
          <p className="mt-1 max-w-md font-sans text-[11px] text-fg-muted">
            Samme index som Belægning (fra board).
            {hiddenCount > 0 ?
              <span className="text-fg-quiet">
                {" "}
                {hiddenCount === 1 ? "1 afdeling er skjult." : `${hiddenCount} afdelinger er skjult.`}
              </span>
            : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && mode === "low" ?
            <TeamDeptExcludeFilter options={deptOptions} excluded={excluded} onChange={(next) => void updateExcluded(next)} />
          : null}
          <PulseSegmentedControl
            size="sm"
            active={mode}
            onChange={setMode}
            tabs={[
              { id: "low", label: "Mindst" },
              { id: "high", label: "Højest" },
            ]}
          />
        </div>
      </div>

      {saveError ?
        <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {saveError}
        </p>
      : null}

      {rows.length === 0 ?
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-4 font-sans text-[12px] text-fg-muted">
          Ingen profiler at vise{hiddenCount > 0 ? " — alle afdelinger med medarbejdere er skjult." : "."}
        </p>
      : <ul className="mt-4 flex flex-col divide-y divide-border-soft">
          {rows.map((r) => (
            <li key={r.member.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CrmAvatar label={r.member.avatar} src={r.member.image} hue={r.member.hue} className="size-8 text-[11px]" />
              <div className="min-w-0 flex-1">
                <Link
                  href={memberProfileHref(r.member)}
                  className={cn(
                    "font-sans text-[13px] font-semibold text-fg hover:text-agency-brand",
                    r.member.isMe && "text-agency-brand",
                  )}
                >
                  {r.member.name}
                </Link>
                <p className="font-sans text-[11px] text-fg-muted">{r.member.role}</p>
              </div>
              <div className="text-[11px] tabular-nums text-fg-muted">
                <span className={cn(r.loadIndex >= 88 ? "font-semibold text-agency-warn" : "text-fg")}>{r.loadIndex}%</span>
                {" · "}
                {r.openCount} åbne
                {r.overdueCount > 0 ? <span className="text-agency-bad"> · {r.overdueCount} økr.</span> : null}
              </div>
            </li>
          ))}
        </ul>
      }
      <p className="mt-3 border-t border-border-soft pt-3 font-sans text-[11px] text-fg-muted">
        <Link href={routes.workload} className="font-medium text-agency-brand hover:underline">
          Åbn fuld workload-matrix →
        </Link>
      </p>
    </section>
  );
}

/**
 * @param {{
 *   options: Array<{ id: string; name: string }>;
 *   excluded: string[];
 *   onChange: (next: string[]) => void;
 * }} props
 */
function TeamDeptExcludeFilter({ options, excluded, onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (!open) return;
    /** @param {MouseEvent} e */
    function onDoc(e) {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const excludedSet = new Set(excluded.map(normalizeDeptKey));

  /** @param {string} id */
  function toggle(id) {
    const key = normalizeDeptKey(id);
    onChange(
      excludedSet.has(key) ? excluded.filter((k) => normalizeDeptKey(k) !== key) : [...excluded, id],
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-sans text-[11px] font-medium transition-colors",
          excluded.length > 0 ?
            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
          : "border-border bg-surface-muted text-fg-muted hover:border-border-strong hover:text-fg",
        )}
      >
        Filtrér afdelinger{excluded.length > 0 ? ` (${excluded.length})` : ""}
        <PulseIconChevronDown size={10} className={cn("shrink-0 opacity-70 transition", open && "rotate-180")} />
      </button>

      {open ?
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Skjul afdelinger"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(260px,calc(100vw-2rem))] rounded-xl border border-border bg-canvas p-2 shadow-xl"
        >
          <p className="border-b border-border-soft px-2 pb-2 font-sans text-[11px] text-fg-muted">
            Markerede afdelinger skjules fra listen for alle brugere.
          </p>
          <ul className="mt-1 max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain">
            {options.map((opt) => {
              const checked = excludedSet.has(normalizeDeptKey(opt.id));
              return (
                <li key={opt.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted",
                      checked && "bg-surface-muted/80",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.id)}
                      className="size-3.5 shrink-0 rounded border-border accent-agency-brand"
                    />
                    <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-fg">{opt.name}</span>
                    {checked ?
                      <span className="text-[10px] text-fg-quiet">Skjult</span>
                    : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      : null}
    </div>
  );
}
