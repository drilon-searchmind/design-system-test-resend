import { cn } from "@/lib/utils";

const STYLES_APEX = {
  ok: "border-border-soft bg-surface-muted/80 text-fg-muted",
  warn: "border-accent-warning/35 bg-surface-muted/80 text-accent-warning",
  bad: "border-danger/40 bg-surface-muted/80 text-danger",
};

const LABEL_APEX = {
  ok: "OK",
  warn: "Advarsel",
  bad: "Kritisk",
};

const STYLES_AGENCY = {
  ok: "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
  warn: "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
  bad: "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
};

const LABEL_AGENCY_DA = {
  ok: "Sund",
  warn: "Advarsel",
  bad: "Kritisk",
};

/**
 * @param {{
 *   health: 'ok' | 'warn' | 'bad';
 *   className?: string;
 *   palette?: 'apex' | 'agency';
 *   compact?: boolean;
 * }} props
 */
export function HealthChip({ health, className, palette = "apex", compact = false }) {
  if (palette === "agency" && compact) {
    const dot = {
      ok: "bg-agency-ok",
      warn: "bg-agency-warn ring-2 ring-agency-warn-border",
      bad: "bg-agency-bad ring-2 ring-agency-bad-border",
    };
    return (
      <span
        className={cn("inline-block size-2 shrink-0 rounded-full", dot[health] ?? dot.ok, className)}
        title={LABEL_AGENCY_DA[health]}
      />
    );
  }

  const styles = palette === "agency" ? STYLES_AGENCY : STYLES_APEX;
  const label = palette === "agency" ? LABEL_AGENCY_DA[health] : LABEL_APEX[health];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[health] ?? styles.ok,
        className,
      )}
    >
      {label ?? health}
    </span>
  );
}
