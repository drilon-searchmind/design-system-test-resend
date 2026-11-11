import { APEX_INDEKS_STATUS_LABELS, isApexIndeksStale } from "@/lib/crm/apex-indeks";
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
 * Indeks (Apex YoY, seneste 30 dage). 100 = uændret, over 100 = vækst.
 * Ikke-"ok" status vises neutralt (aldrig som 100). Forældet tal får en advarsel.
 *
 * @param {{
 *   value: number | null | undefined;
 *   status?: string;
 *   computedAt?: string;
 *   partial?: boolean;
 *   className?: string;
 * }} props
 */
export function IndeksValue({ value, status, computedAt, partial, className }) {
  if (typeof value !== "number") {
    const label = status ? (APEX_INDEKS_STATUS_LABELS[status] ?? status) : "Ikke hentet fra Apex endnu";
    return (
      <span className={cn("text-fg-quiet", className)} title={`Indeks: ${label}`}>
        —
      </span>
    );
  }
  const stale = isApexIndeksStale(computedAt);
  const arrow = value > 100 ? "▲" : value < 100 ? "▼" : "▬";
  const notes = [
    "Indeks · Apex YoY, seneste 30 dage (100 = uændret)",
    computedAt ? `Beregnet ${computedAt.slice(0, 10)} ${computedAt.slice(11, 16)} UTC` : null,
    stale ? "Advarsel: tallet er forældet" : null,
    partial ? "Delvis: nogle domæner mangler eller fejlede" : null,
  ].filter(Boolean);
  return (
    <span
      className={cn(
        "tabular-nums",
        value >= 100 && "text-agency-ok",
        value >= 85 && value < 100 && "text-agency-warn",
        value < 85 && "text-agency-bad",
        className,
      )}
      title={notes.join("\n")}
    >
      <span aria-hidden className="mr-0.5 text-[0.7em]">
        {arrow}
      </span>
      {value}
      {stale || partial ?
        <span aria-label="Advarsel" className="ml-0.5 text-agency-warn">
          !
        </span>
      : null}
    </span>
  );
}