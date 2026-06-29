import { cn } from "@/lib/utils";

const MAP = {
  high: "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
  medium: "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
  low: "border-border bg-surface-muted text-fg-muted",
};

const LABEL = {
  high: "Høj",
  medium: "Mellem",
  low: "Lav",
};

/**
 * @param {{ priority: 'high' | 'medium' | 'low'; className?: string }} props
 */
export function TaskPriorityChip({ priority, className }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        MAP[priority] ?? MAP.medium,
        className,
      )}
    >
      {LABEL[priority] ?? priority}
    </span>
  );
}
