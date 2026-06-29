"use client";

import {
  MONTH_NAMES_DA,
  canGoToNextPeriod,
  canGoToPrevPeriod,
  formatReportPeriodLabel,
  getCurrentReportPeriod,
  getMaxSelectableMonth,
  getSelectableYears,
  isCurrentReportPeriod,
  shiftReportPeriod,
} from "@/lib/crm/report-period";
import { PulseIconChevronDown, PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-8 appearance-none rounded-full border border-border bg-surface-muted pl-3 pr-8",
  "text-[11px] font-medium text-fg",
  "outline-none transition-colors hover:border-agency-brand-border hover:bg-canvas",
  "focus-visible:ring-2 focus-visible:ring-agency-brand",
);

const navBtnClass = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border",
  "bg-surface-muted text-fg-muted transition-colors",
  "hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand",
  "disabled:pointer-events-none disabled:opacity-40",
);

/**
 * Month + year picker with prev/next navigation.
 * @param {{
 *   year: number;
 *   month: number;
 *   onChange: (period: { year: number; month: number }) => void;
 *   className?: string;
 *   compact?: boolean;
 * }} props
 */
export function ReportPeriodPicker({ year, month, onChange, className, compact = false }) {
  const years = getSelectableYears(4);
  const maxMonth = getMaxSelectableMonth(year);
  const canPrev = canGoToPrevPeriod(year, month);
  const canNext = canGoToNextPeriod(year, month);
  const showCurrentShortcut = !isCurrentReportPeriod(year, month);

  const go = (nextYear, nextMonth) => {
    onChange({ year: nextYear, month: nextMonth });
  };

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label={`Periode: ${formatReportPeriodLabel(year, month)}`}
    >
      <button
        type="button"
        className={navBtnClass}
        disabled={!canPrev}
        aria-label="Forrige måned"
        onClick={() => {
          const p = shiftReportPeriod(year, month, -1);
          go(p.year, p.month);
        }}
      >
        <PulseIconChevronRight className="rotate-180" size={12} />
      </button>

      <div className="relative">
        <select
          className={cn(selectClass, compact ? "min-w-[5.5rem]" : "min-w-[6.5rem]")}
          value={month}
          aria-label="Måned"
          onChange={(e) => go(year, Number(e.target.value))}
        >
          {MONTH_NAMES_DA.map((label, i) => {
            const m = i + 1;
            if (m > maxMonth) return null;
            return (
              <option key={m} value={m}>
                {label}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-quiet">
          <PulseIconChevronDown size={10} />
        </span>
      </div>

      <div className="relative">
        <select
          className={cn(selectClass, "min-w-[4.25rem] tabular-nums")}
          value={year}
          aria-label="År"
          onChange={(e) => {
            const y = Number(e.target.value);
            const cappedMonth = Math.min(month, getMaxSelectableMonth(y));
            go(y, cappedMonth);
          }}
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
        disabled={!canNext}
        aria-label="Næste måned"
        onClick={() => {
          const p = shiftReportPeriod(year, month, 1);
          go(p.year, p.month);
        }}
      >
        <PulseIconChevronRight size={12} />
      </button>

      {showCurrentShortcut ? (
        <button
          type="button"
          className={cn(
            "h-8 rounded-full px-3 text-[11px] font-medium text-agency-brand",
            "transition-colors hover:bg-agency-brand-soft",
          )}
          onClick={() => {
            const c = getCurrentReportPeriod();
            go(c.year, c.month);
          }}
        >
          Denne måned
        </button>
      ) : null}
    </div>
  );
}
