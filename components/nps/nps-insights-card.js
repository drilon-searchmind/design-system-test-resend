import Link from "next/link";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{ alerts: import('@/lib/crm/static-data').SMART_ALERTS[number][] }} props
 */
export function NpsInsightsCard({ alerts }) {
  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Signals fra Pulse
        </h2>
        <Link href={routes.pulse} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Agency Pulse →
        </Link>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Filtreret til kundetilfredshed og NPS-relaterede hændelser fra det delte alerts-lag.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-[13px] text-fg-muted">
          Ingen NPS-flag lige nu — aktiver flere integrationsregler eller tilføj `npsDrop` alerts.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-3">
              <p
                className={cn(
                  "font-sans text-[12px] font-semibold leading-snug",
                  a.severity === "bad" ? "text-agency-bad" : "text-agency-warn",
                )}
              >
                {a.title}
              </p>
              <p className="mt-1 font-sans text-[11px] leading-snug text-fg-muted">{a.body}</p>
              <span className="mt-2 inline-block text-[10px] uppercase tracking-wide text-fg-quiet">
                {a.type} · {a.age}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
