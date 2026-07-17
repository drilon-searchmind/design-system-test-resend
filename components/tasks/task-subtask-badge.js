import { cn } from "@/lib/utils";

/**
 * @param {{ className?: string; compact?: boolean }} props
 */
export function TaskSubtaskBadge({ className, compact = false }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-surface-muted font-sans font-semibold uppercase tracking-[0.06em] text-fg-muted",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      Delopgave
    </span>
  );
}
