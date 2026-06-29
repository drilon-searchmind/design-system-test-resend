import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   value: number;
 *   invert?: boolean;
 *   format?: (v: number) => string;
 *   className?: string;
 * }} props
 */
export function PulseDeltaChip({ value, invert = false, format, className }) {
  const fmt = format ?? ((v) => formatPercent(v));
  const pos = value > 0;
  const neg = value < 0;
  const favorable = invert ? neg || (!pos && !neg) : pos || (!pos && !neg);
  const tone = !pos && !neg ? "muted" : favorable ? "ok" : "bad";

  const cls =
    tone === "muted"
      ? "text-fg-quiet"
      : tone === "ok"
        ? "text-agency-ok"
        : "text-agency-bad";

  const prefix = pos ? "+" : neg ? "-" : "";

  return (
    <span className={cn("text-[11px] font-semibold tabular-nums tracking-tight", cls, className)}>
      {prefix}
      {fmt(Math.abs(value))}
    </span>
  );
}
