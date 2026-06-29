import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { formatHoursDecimalDa, formatIsoDayMonthDa } from "@/lib/crm/format-da";
import { isWeekendIso } from "@/lib/crm/time-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   days: {
 *     iso: string;
 *     label: string;
 *     minutes: number;
 *     isToday?: boolean;
 *   }[];
 *   dailyTargetMinutes: number;
 *   weekCaption: string;
 * }} props
 */
export function TimeWeekStrip({ days, dailyTargetMinutes, weekCaption }) {
  const targetHours = dailyTargetMinutes / 60;

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            Ugereolen
          </h2>
          <p className="mt-1 font-sans text-[11px] leading-snug text-fg-muted">
            Registreret tid pr. dag mod mål {formatHoursDecimalDa(dailyTargetMinutes)} (7,5 t). Weekend vises for
            kontekst — typisk 0 i Agency OS.
          </p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-quiet">{weekCaption}</p>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const weekend = isWeekendIso(d.iso);
          const hours = d.minutes / 60;
          return (
            <div
              key={d.iso}
              className={cn(
                "flex min-w-[92px] flex-col gap-2 rounded-xl border px-2.5 py-3",
                d.isToday
                  ? "border-agency-brand-border bg-agency-brand-soft/35"
                  : "border-border-soft bg-surface-muted/40",
                weekend && "opacity-70",
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                  {d.label}
                </span>
                <span className="text-[9px] tabular-nums text-fg-quiet">{formatIsoDayMonthDa(d.iso)}</span>
              </div>
              <p className="text-[14px] font-semibold tabular-nums leading-none text-fg">
                {formatHoursDecimalDa(d.minutes)}
              </p>
              <PulseUtilBar hours={hours} budget={targetHours} className="mt-auto" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
