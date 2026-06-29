import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { formatHoursDecimalDa, formatIsoDayMonthDa } from "@/lib/crm/format-da";
import { CALENDAR_WEEKDAY_HEADERS_DA_MON } from "@/lib/crm/time-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   cells: {
 *     key: string;
 *     kind: "blank" | "day";
 *     iso?: string;
 *     minutes?: number;
 *     label?: string;
 *     isToday?: boolean;
 *     weekend?: boolean;
 *   }[];
 *   dailyTargetMinutes: number;
 *   periodCaption: string;
 *   periodSubtitle?: string;
 *   selectedDayIso?: string;
 *   onSelectDay?: (iso: string) => void;
 * }} props
 */
export function TimeMonthCalendar({
  cells,
  dailyTargetMinutes,
  periodCaption,
  periodSubtitle = "",
  selectedDayIso = "",
  onSelectDay,
}) {
  const targetHours = dailyTargetMinutes / 60;

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Månedskalender
          </h2>
          <p className="mt-1 max-w-[48ch] font-sans text-[11px] leading-snug text-fg-muted">
            Registreret tid pr. dag mod mål {formatHoursDecimalDa(dailyTargetMinutes)} · klik på en dag for at se{" "}
            stemplerne.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-quiet">{periodCaption}</p>
          {periodSubtitle ? (
            <p className="mt-0.5 font-sans text-[11px] capitalize text-fg-muted">{periodSubtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 pb-1 sm:gap-2">
        {CALENDAR_WEEKDAY_HEADERS_DA_MON.map((h) => (
          <div
            key={h}
            className="flex min-h-[26px] items-center justify-center text-[9px] font-semibold uppercase tracking-wide text-fg-quiet"
          >
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((c) =>
          c.kind === "blank" ?
            <div key={c.key} className="hidden min-h-[88px] sm:block sm:min-h-[96px]" aria-hidden />
          : (() => {
              const d = c;
              const iso = typeof d.iso === "string" ? d.iso : "";
              const mins = typeof d.minutes === "number" ? d.minutes : 0;
              const weekend = Boolean(d.weekend);
              const hours = mins / 60;
              const isSelected =
                typeof selectedDayIso === "string" &&
                selectedDayIso.length >= 10 &&
                typeof iso === "string" &&
                iso === selectedDayIso.trim().slice(0, 10);
              return (
                <button
                  type="button"
                  key={d.key}
                  aria-label={iso ? `Vælg dato ${formatIsoDayMonthDa(iso)}` : "Vælg dato"}
                  aria-pressed={Boolean(isSelected)}
                  onClick={() => {
                    if (typeof iso === "string" && iso.length >= 10 && typeof onSelectDay === "function")
                      onSelectDay(iso);
                  }}
                  className={cn(
                    "flex min-h-[88px] min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg border px-1.5 py-2 text-left outline-none ring-offset-2 ring-offset-canvas transition-[border-color,background-color] sm:min-h-[96px] sm:px-2 sm:py-2.5",
                    "hover:border-agency-brand-border hover:bg-agency-brand-soft/20 focus-visible:ring-2 focus-visible:ring-agency-brand",
                    d.isToday
                      ? "border-agency-brand-border bg-agency-brand-soft/35"
                      : "border-border-soft bg-surface-muted/35",
                    isSelected && "border-2 border-agency-brand",
                    weekend && "opacity-65",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-0.5">
                    <span className="font-sans text-[12px] font-semibold tabular-nums leading-none text-fg">
                      {d.label ?? "—"}
                    </span>
                    <span className="hidden truncate text-[8px] tabular-nums text-fg-muted sm:inline">
                      {iso ? formatIsoDayMonthDa(iso) : ""}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold tabular-nums leading-none text-fg sm:text-[12px]">
                    {formatHoursDecimalDa(mins)}
                  </p>
                  <PulseUtilBar hours={hours} budget={targetHours} className="mt-auto pointer-events-none" />
                </button>
              );
            })(),
        )}
      </div>
    </section>
  );
}
