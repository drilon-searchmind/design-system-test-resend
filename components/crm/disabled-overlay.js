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
 * }} props
 */
export function DisabledOverlay({ children, className, title = "Ikke tilgængelig endnu", label }) {
  return (
    <div className={cn("relative isolate", className)} aria-disabled="true">
      <div className="pointer-events-none select-none">{children}</div>
      <div
        className="ds-disabled-hatch absolute inset-0 z-10 cursor-not-allowed"
        title={title}
        role="presentation"
      />
      {label ?
        <span className="sr-only">{label}</span>
      : null}
    </div>
  );
}
