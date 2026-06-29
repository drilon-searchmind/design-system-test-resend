import { tallyPanel } from "@/lib/ui/tally-chrome";
import { cn } from "@/lib/utils";

/**
 * @param {{ label: string; value: string; hint?: string; className?: string }} props
 */
export function KpiCard({ label, value, hint, className }) {
  return (
    <div className={cn(tallyPanel, "p-4 md:p-5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-soft">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-fg md:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-fg-muted">{hint}</p> : null}
    </div>
  );
}
