import { PulseDeltaChip } from "@/components/pulse/pulse-delta-chip";
import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { cn } from "@/lib/utils";

const TONE_TEXT = {
  brand: "text-agency-brand",
  ok: "text-agency-ok",
  warn: "text-agency-warn",
  bad: "text-agency-bad",
};

/**
 * @param {{
 *   label: string;
 *   value: string;
 *   delta?: number | null;
 *   deltaInvert?: boolean;
 *   deltaFormat?: (v: number) => string;
 *   sparkData?: number[];
 *   tone?: 'brand' | 'ok' | 'warn' | 'bad';
 *   className?: string;
 * }} props
 */
export function PulseKpiCard({
  label,
  value,
  delta = null,
  deltaInvert = false,
  deltaFormat,
  sparkData,
  tone = "brand",
  className,
}) {
  const accent = TONE_TEXT[tone] ?? TONE_TEXT.brand;

  return (
    <div className={cn("tally-panel relative overflow-hidden p-4 md:p-5", className)}>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-soft">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[22px] font-semibold tabular-nums tracking-tight text-fg">
          {value}
        </p>
        {delta != null && Number.isFinite(delta) ? (
          <PulseDeltaChip value={delta} invert={deltaInvert} format={deltaFormat} />
        ) : null}
      </div>
      {sparkData?.length ? (
        <div className={cn("mt-3 text-current", accent)}>
          <PulseSparkline data={sparkData} height={30} />
        </div>
      ) : null}
    </div>
  );
}
