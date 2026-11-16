import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
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
 *   info?: { title: string; body: import('react').ReactNode };
 *   value: string;
 *   delta?: number | null;
 *   deltaInvert?: boolean;
 *   deltaFormat?: (v: number) => string;
 *   sparkData?: number[];
 *   tone?: 'brand' | 'ok' | 'warn' | 'bad';
 *   visual?: import('react').ReactNode;
 *   className?: string;
 * }} props
 */
export function PulseKpiCard({
  label,
  info,
  value,
  delta = null,
  deltaInvert = false,
  deltaFormat,
  sparkData,
  tone = "brand",
  visual,
  className,
}) {
  const accent = TONE_TEXT[tone] ?? TONE_TEXT.brand;

  return (
    <div className={cn("tally-panel relative overflow-hidden p-4 md:p-5", className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-soft">{label}</p>
        {info ?
          <CrmHoverPopover
            title={info.title}
            content={<div className="space-y-1.5 text-[12px] leading-snug text-fg-muted">{info.body}</div>}
            triggerClassName="rounded-full text-fg-quiet hover:text-fg"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              role="img"
              aria-label={`Forklaring: ${label}`}
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.2v3.6" strokeLinecap="round" />
              <circle cx="8" cy="5.0" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </CrmHoverPopover>
        : null}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[22px] font-semibold tabular-nums tracking-tight text-fg">
          {value}
        </p>
        {delta != null && Number.isFinite(delta) ? (
          <PulseDeltaChip value={delta} invert={deltaInvert} format={deltaFormat} />
        ) : null}
      </div>
      {visual ? <div className="mt-3">{visual}</div> : null}
      {!visual && sparkData?.length ? (
        <div className={cn("mt-3 text-current", accent)}>
          <PulseSparkline data={sparkData} height={30} />
        </div>
      ) : null}
    </div>
  );
}
