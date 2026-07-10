"use client";

import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   sendLog: {
 *     totalSent: number;
 *     totalFailed: number;
 *     recent: { id: string; clientSlug: string; contactEmail: string; templateKey: string; status: string; sentAt: string; subject: string }[];
 *   };
 *   clients: { id: string; name: string }[];
 * }} props
 */
export function NpsSendLogCard({ sendLog, clients }) {
  const totalSent = typeof sendLog?.totalSent === "number" ? sendLog.totalSent : 0;
  const totalFailed = typeof sendLog?.totalFailed === "number" ? sendLog.totalFailed : 0;
  const recent = Array.isArray(sendLog?.recent) ? sendLog.recent : [];

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-sans text-sm font-semibold text-fg">E-mail-log</h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">
            Udsendelser via Postmark — gemt i databasen.
          </p>
        </div>
        <div className="flex gap-3 font-sans text-[12px]">
          <span className="tabular-nums text-fg">
            <span className="font-semibold text-agency-ok">{totalSent}</span> sendt
          </span>
          {totalFailed > 0 ?
            <span className="tabular-nums text-agency-bad">
              <span className="font-semibold">{totalFailed}</span> fejlet
            </span>
          : null}
        </div>
      </div>

      {recent.length === 0 ?
        <p className="mt-4 rounded-xl border border-dashed border-border-soft bg-surface-muted/35 px-3 py-5 text-center font-sans text-[12px] text-fg-muted">
          Ingen udsendelser logget endnu — brug &quot;Send NPS&quot; på en konto.
        </p>
      : <ul className="mt-4 flex flex-col divide-y divide-border-soft">
          {recent.map((row) => {
            const client = clients.find((c) => c.id === row.clientSlug);
            const sentLabel = row.sentAt ? formatIsoDateDa(row.sentAt.slice(0, 10)) : "—";
            return (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0">
                <span className="min-w-[120px] font-sans text-[12px] font-semibold text-fg">
                  {client?.name ?? row.clientSlug}
                </span>
                <span className="truncate text-[11px] text-fg-muted">{row.contactEmail}</span>
                <span className="text-[10px] text-fg-quiet">{row.templateKey}</span>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase",
                    row.status === "sent" ? "text-agency-ok" : "text-agency-bad",
                  )}
                >
                  {row.status === "sent" ? "Sendt" : "Fejl"}
                </span>
                <span className="text-[10px] tabular-nums text-fg-quiet">{sentLabel}</span>
              </li>
            );
          })}
        </ul>
      }
    </section>
  );
}
