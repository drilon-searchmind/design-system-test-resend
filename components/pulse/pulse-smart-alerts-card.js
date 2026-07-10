import Link from "next/link";

import { DisabledOverlay } from "@/components/crm/disabled-overlay";
import { PulseIconSparkle } from "@/components/pulse/pulse-icons";
import { routes } from "@/config/routes";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { cn } from "@/lib/utils";

export function PulseSmartAlertsCard() {
  const { smartAlerts: alerts, clients: CLIENTS } = usePulseData();
  const counts = {
    bad: alerts.filter((a) => a.severity === "bad").length,
    warn: alerts.filter((a) => a.severity === "warn").length,
  };

  return (
    <DisabledOverlay
      className="tally-panel overflow-hidden"
      title="Smart Alerts er ikke tilgængelig endnu"
      label="Smart Alerts er ikke tilgængelig endnu"
    >
      <section aria-labelledby="pulse-alerts-heading">
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="pulse-alerts-heading"
                className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-fg"
              >
                <PulseIconSparkle className="text-agency-brand" size={14} />
                Smart Alerts
              </h3>
              <p className="mt-1 font-sans text-[11.5px] text-fg-muted">
                <span className="font-medium text-agency-bad">● {counts.bad} kritiske</span>
                <span className="mx-1.5 text-fg-quiet">·</span>
                <span className="font-medium text-agency-warn">● {counts.warn} advarsler</span>
              </p>
            </div>
            <button
              type="button"
              disabled
              tabIndex={-1}
              className="h-[26px] shrink-0 rounded-full border border-border px-3 text-[11px] font-medium text-fg-muted"
            >
              Konfigurér
            </button>
          </div>
        </div>

        <ul className="max-h-[420px] overflow-y-auto overscroll-contain">
          {alerts.length === 0 ?
            <li className="px-4 py-6 font-sans text-[13px] text-fg-muted md:px-5">
              Ingen aktive alerts — alt ser roligt ud.
            </li>
          : null}
          {alerts.map((a) => {
            const c = a.client ? CLIENTS.find((x) => x.id === a.client) : null;
            const href = c ? `${routes.clients}/${c.id}` : null;

            const inner = (
              <>
                <div
                  className={cn(
                    "w-1 shrink-0 rounded-full",
                    a.severity === "bad" ? "bg-agency-bad" : "bg-agency-warn",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {c ?
                      <span
                        className="flex size-[18px] shrink-0 items-center justify-center rounded-md border border-border text-[9px] font-semibold text-agency-brand-fg"
                        style={{
                          background: `oklch(62% 0.14 ${c.hue})`,
                        }}
                      >
                        {c.logo}
                      </span>
                    : null}
                    <span className="font-sans text-[12.5px] font-medium text-fg">{a.title}</span>
                  </div>
                  <p className="mt-0.5 font-sans text-[11.5px] leading-snug text-fg-muted">{a.body}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] text-fg-quiet">{a.age}</span>
              </>
            );

            const rowCls = "flex w-full gap-3 px-4 py-2.5 text-left md:px-5";

            return (
              <li key={a.id} className="border-b border-border-soft last:border-0">
                {href ?
                  <Link href={href} tabIndex={-1} className={rowCls}>
                    {inner}
                  </Link>
                : <div className={rowCls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      </section>
    </DisabledOverlay>
  );
}
