import { cn } from "@/lib/utils";

/**
 * Diagonal hatch overlay for preview / disabled UI regions.
 * Blocks interaction and shows `cursor-not-allowed` on hover.
 *
 * @param {{
 *   children: import("react").ReactNode;
 *   className?: string;
 *   title?: string;
 *   label?: string;
 *   badge?: string | null;
 * }} props
 */
export function DisabledOverlay({
  children,
  className,
  title = "Ikke tilgængelig endnu",
  label,
  badge = "WIP",
}) {
  return (
    <div className={cn("relative isolate", className)} aria-disabled="true">
      <div className="pointer-events-none select-none">{children}</div>
      <div
        className="absolute inset-0 z-10 flex cursor-not-allowed items-center justify-center"
        title={title}
        role="presentation"
      >
        <div className="ds-disabled-hatch absolute inset-0" aria-hidden />
        {badge ?
          <span className="relative z-[1] rounded-md border border-border bg-canvas/92 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted backdrop-blur-[2px]">
            {badge}
          </span>
        : null}
      </div>
      {label ?
        <span className="sr-only">{label}</span>
      : null}
    </div>
  );
}
