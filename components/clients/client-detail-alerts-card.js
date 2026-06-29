import Link from "next/link";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   clientId: string;
 *   alerts: Array<{
 *     id: string;
 *     severity: string;
 *     title: string;
 *     body: string;
 *     age: string;
 *     client?: string | null;
 *   }>;
 *   description?: string;
 * }} props
 */
export function ClientDetailAlertsCard({ clientId, alerts, description }) {
  const rows = alerts.filter((a) => a.client === clientId);

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Krydsreferencede Pulse-alerts
        </h2>
        <Link href={routes.pulse} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Agency Pulse →
        </Link>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        {description ?? (
          <>
            Read-only udtræk af alerts matcher på <span className="text-fg">{clientId}</span>.
          </>
        )}
      </p>

      <ul className="mt-4 flex flex-col gap-2 font-sans text-[13px]">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-5 text-[13px] text-fg-muted">
            Denne kunde triggrer ikke nogen aktiv alert — Pulse viser øvrige alarmer.
          </li>
        ) : (
          rows.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                a.severity === "bad" && "border-agency-bad-border bg-agency-bad-soft/30",
                a.severity === "warn" && "border-agency-warn-border bg-agency-warn-soft/30",
                !["bad", "warn"].includes(a.severity) &&
                  "border-border bg-surface-muted/35",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-fg-quiet">
                <span className="uppercase">{a.severity}</span>
                <span>·</span>
                <span>{a.age}</span>
              </div>
              <p className="mt-2 font-semibold text-fg">{a.title}</p>
              <p className="mt-1 leading-relaxed text-fg-muted">{a.body}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
