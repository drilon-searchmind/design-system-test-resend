"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PulseIconChevronDown, PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import {
  MONTH_NAMES_DA,
  currentMonthSelection,
  formatReportPeriodSelectionLabel,
  getCurrentReportPeriod,
  getMaxSelectableMonth,
  getReportPeriodPresets,
  getSelectableYears,
  isCurrentMonthSelection,
  normalizeReportPeriod,
  normalizeReportPeriodSelection,
  reportPeriodKey,
  sortReportPeriods,
  uniqueReportPeriods,
} from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

const navBtnClass = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border",
  "bg-surface-muted text-fg-muted transition-colors",
  "hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand",
  "disabled:pointer-events-none disabled:opacity-40",
);

/**
 * Advanced month picker — single or multi-month with presets.
 * @param {{
 *   selection?: import('@/lib/crm/report-period').ReportPeriodSelection;
 *   onSelectionChange?: (selection: import('@/lib/crm/report-period').ReportPeriodSelection) => void;
 *   year?: number;
 *   month?: number;
 *   onChange?: (period: { year: number; month: number }) => void;
 *   className?: string;
 *   compact?: boolean;
 * }} props
 */
export function ReportPeriodPicker({
  selection: selectionProp,
  onSelectionChange,
  year,
  month,
  onChange,
  className,
  compact = false,
}) {
  const resolvedSelection = useMemo(() => {
    if (selectionProp) return normalizeReportPeriodSelection(selectionProp);
    if (year != null && month != null) return normalizeReportPeriodSelection({ year, month });
    return currentMonthSelection();
  }, [selectionProp, year, month]);

  const emitSelection = (next) => {
    const normalized = normalizeReportPeriodSelection(next);
    onSelectionChange?.(normalized);
    if (onChange) {
      const sorted = sortReportPeriods(normalized.months);
      const anchor = sorted[sorted.length - 1] ?? getCurrentReportPeriod();
      onChange(anchor);
    }
  };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => primaryYearFromSelection(resolvedSelection));
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const selectedKeys = useMemo(
    () => new Set(resolvedSelection.months.map(reportPeriodKey)),
    [resolvedSelection],
  );

  const years = getSelectableYears(4);
  const maxMonth = getMaxSelectableMonth(viewYear);
  const presets = getReportPeriodPresets();
  const showCurrentShortcut = !isCurrentMonthSelection(resolvedSelection);

  useEffect(() => {
    if (!open) return;
    setViewYear(primaryYearFromSelection(resolvedSelection));
  }, [open, resolvedSelection]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggleMonth(m) {
    const key = reportPeriodKey({ year: viewYear, month: m });
    const nextKeys = new Set(selectedKeys);
    if (nextKeys.has(key)) {
      if (nextKeys.size === 1) return;
      nextKeys.delete(key);
    } else {
      nextKeys.add(key);
    }
    const months = [...nextKeys].map(parseKeyOrNull).filter(Boolean);
    emitSelection({ months: uniqueReportPeriods(months) });
  }

  function applyPreset(build) {
    emitSelection({ months: uniqueReportPeriods(build()) });
    setOpen(false);
  }

  function selectAllInYear() {
    /** @type {import('@/lib/crm/report-period').ReportPeriod[]} */
    const months = [];
    for (let m = 1; m <= maxMonth; m += 1) {
      months.push(normalizeReportPeriod({ year: viewYear, month: m }));
    }
    emitSelection({ months });
  }

  function clearToCurrentMonth() {
    emitSelection(currentMonthSelection());
    setOpen(false);
  }

  const label = formatReportPeriodSelectionLabel(resolvedSelection);
  const countLabel =
    resolvedSelection.months.length > 1 ? `${resolvedSelection.months.length} mdr.` : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Periode: ${label}`}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-sans text-[11px] font-medium transition-colors",
            open || resolvedSelection.months.length > 1 ?
              "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
            : "border-border bg-surface-muted text-fg hover:border-agency-brand-border hover:bg-canvas",
            compact ? "max-w-[180px]" : "max-w-[240px]",
          )}
        >
          <span className="truncate">{label}</span>
          {countLabel ?
            <span className="shrink-0 rounded-full bg-canvas/80 px-1.5 py-px text-[9px] font-semibold tabular-nums">
              {countLabel}
            </span>
          : null}
          <PulseIconChevronDown size={10} className={cn("shrink-0 opacity-70 transition", open && "rotate-180")} />
        </button>

        {open ?
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Vælg periode"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-canvas shadow-xl"
          >
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div className="border-b border-border-soft p-3 sm:border-b-0 sm:border-r">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Genveje</p>
                <ul className="mt-2 space-y-0.5">
                  {presets.map((preset) => (
                    <li key={preset.id}>
                      <button
                        type="button"
                        onClick={() => applyPreset(preset.build)}
                        className="w-full rounded-lg px-2 py-1.5 text-left font-sans text-[12px] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                      >
                        {preset.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={navBtnClass}
                    disabled={viewYear <= years[years.length - 1]}
                    aria-label="Forrige år"
                    onClick={() => setViewYear((y) => y - 1)}
                  >
                    <PulseIconChevronRight className="rotate-180" size={12} />
                  </button>

                  <div className="relative min-w-[5rem]">
                    <select
                      className={cn(
                        "h-8 w-full appearance-none rounded-full border border-border bg-surface-muted pl-3 pr-8",
                        "text-center text-[11px] font-semibold tabular-nums text-fg",
                        "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                      )}
                      value={viewYear}
                      aria-label="År"
                      onChange={(e) => setViewYear(Number(e.target.value))}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-quiet">
                      <PulseIconChevronDown size={10} />
                    </span>
                  </div>

                  <button
                    type="button"
                    className={navBtnClass}
                    disabled={viewYear >= getCurrentReportPeriod().year}
                    aria-label="Næste år"
                    onClick={() => setViewYear((y) => y + 1)}
                  >
                    <PulseIconChevronRight size={12} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES_DA.map((name, i) => {
                    const m = i + 1;
                    if (m > maxMonth) {
                      return (
                        <div
                          key={m}
                          className="flex h-9 items-center justify-center rounded-lg border border-transparent px-1 text-[11px] text-fg-quiet/40"
                        >
                          {name.slice(0, 3)}
                        </div>
                      );
                    }
                    const key = reportPeriodKey({ year: viewYear, month: m });
                    const selected = selectedKeys.has(key);
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleMonth(m)}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-lg border px-1 font-sans text-[11px] font-medium transition-colors",
                          selected ?
                            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                          : "border-border-soft bg-surface-muted/40 text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg",
                        )}
                      >
                        {name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-1 border-t border-border-soft pt-3">
                  <button
                    type="button"
                    onClick={selectAllInYear}
                    className="rounded-md px-2 py-1 font-sans text-[11px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                  >
                    Hele {viewYear}
                  </button>
                  <button
                    type="button"
                    onClick={clearToCurrentMonth}
                    className="rounded-md px-2 py-1 font-sans text-[11px] font-medium text-agency-brand hover:bg-agency-brand-soft"
                  >
                    Denne måned
                  </button>
                </div>
              </div>
            </div>
          </div>
        : null}
      </div>

      {showCurrentShortcut ?
        <button
          type="button"
          className={cn(
            "h-8 rounded-full px-3 text-[11px] font-medium text-agency-brand",
            "transition-colors hover:bg-agency-brand-soft",
          )}
          onClick={clearToCurrentMonth}
        >
          Denne måned
        </button>
      : null}
    </div>
  );
}

/** @param {import('@/lib/crm/report-period').ReportPeriodSelection} selection */
function primaryYearFromSelection(selection) {
  const sorted = sortReportPeriods(selection.months);
  return sorted[sorted.length - 1]?.year ?? getCurrentReportPeriod().year;
}

/** @param {string} key */
function parseKeyOrNull(key) {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return normalizeReportPeriod({ year: Number(m[1]), month: Number(m[2]) });
}
