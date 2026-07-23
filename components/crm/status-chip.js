import { cn } from "@/lib/utils";

const MAP_APEX = {
  active: "border-accent-green/40 text-accent-green",
  paused: "border-accent-warning/40 text-accent-warning",
  inactive: "border-fg-quiet text-fg-quiet",
  pending_signature: "border-accent-blue/40 text-accent-blue",
};

const MAP_AGENCY = {
  active: "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
  paused: "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
  inactive: "border-border bg-surface-muted text-fg-quiet",
  pending_signature: "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
};

const LABEL = {
  active: "Aktiv",
  paused: "Pause",
  inactive: "Inaktiv",
  pending_signature: "Afventer underskrift",
};

/**
 * @param {{
 *   status: 'active' | 'paused' | 'inactive' | 'pending_signature';
 *   className?: string;
 *   palette?: 'apex' | 'agency';
 * }} props
 */
export function StatusChip({ status, className, palette = "apex" }) {
  const map = palette === "agency" ? MAP_AGENCY : MAP_APEX;
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 font-sans text-[11px] font-medium",
        map[status] ?? map.active,
        className,
      )}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
