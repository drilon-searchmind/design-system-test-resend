import { cn } from "@/lib/utils";

/** @param {{ value: number | null | undefined; className?: string }} props */
export function NpsValue({ value, className }) {
  if (typeof value !== "number") {
    return <span className={cn("text-fg-quiet", className)}>—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        value >= 50 && "text-agency-ok",
        value >= 0 && value < 50 && "text-agency-warn",
        value < 0 && "text-agency-bad",
        className,
      )}
    >
      {value}
    </span>
  );
}

/**
 * Indeks (Apex YoY, seneste 30 dage). 100 = uændret.
 * @param {{ value: number | null | undefined; className?: string }} props
 */
export function IndeksValue({ value, className }) {
  if (typeof value !== "number") {
    return <span className={cn("text-fg-quiet", className)}>—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        value >= 100 && "text-agency-ok",
        value >= 85 && value < 100 && "text-agency-warn",
        value < 85 && "text-agency-bad",
        className,
      )}
      title="Indeks · Apex YoY, seneste 30 dage (100 = uændret)"
    >
      {value}
    </span>
  );
}
