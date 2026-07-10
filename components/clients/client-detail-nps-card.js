import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { NPS_INTERVAL_DA } from "@/lib/crm/nps-intervals-da";
import { cn } from "@/lib/utils";

function scoreTone(score) {
  if (score >= 50) return "text-agency-ok";
  if (score >= 40) return "text-agency-warn";
  return "text-agency-bad";
}

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number] }} props
 */
export function ClientDetailNpsCard({ client }) {
  const raw = [...(client.npsHistory ?? [])].reverse();
  const rows = raw.slice(0, 12);

  const intervalKey = client.npsInterval;
  const cadenceLabel =
    intervalKey && intervalKey in NPS_INTERVAL_DA
      ? NPS_INTERVAL_DA[/** @type {keyof typeof NPS_INTERVAL_DA} */ (intervalKey)]
      : client.npsInterval ?? "Ikke fastlagt";

  const spark = [...(client.npsHistory ?? [])].map((e) => e.score);

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        NPS & loyalitet
      </h2>
      <p className="mt-2 font-sans text-[12px] text-fg-muted">{cadenceLabel}</p>

      {spark.length > 2 ? (
        <div className="mt-3 text-agency-brand">
          <p className="mb-1 font-sans text-[11px] text-fg-soft">Trend (historiske scoringer)</p>
          <PulseSparkline data={spark} height={36} />
        </div>
      ) : spark.length === 2 ? (
        <div className="mt-3 text-[11px] text-fg-muted">
          Kun to punkter — flere målinger giver graf.
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell">Sendt</th>
              <th className="py-2 font-medium">Modtaget</th>
              <th className="hidden py-2 font-medium lg:table-cell">Kommentar</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[13px] text-fg-muted">
                  Endnu ingen målinger registreret.
                </td>
              </tr>
            ) : (
              rows.map((entry, idx) => (
                <tr key={`${entry.respondedAt ?? entry.sentAt}-${idx}`} className="border-b border-border-soft last:border-0">
                  <td className={cn("py-2.5 pr-3 text-base font-semibold tabular-nums", scoreTone(entry.score))}>
                    {entry.score}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-[11px] tabular-nums text-fg-muted sm:table-cell">
                    {entry.sentAt ? formatIsoDateDa(String(entry.sentAt).slice(0, 10)) : "—"}
                  </td>
                  <td className="py-2.5 text-[11px] tabular-nums text-fg-muted">
                    {entry.respondedAt ? formatIsoDateDa(String(entry.respondedAt).slice(0, 10)) : "—"}
                  </td>
                  <td className="hidden max-w-[220px] py-2.5 text-[11px] leading-snug text-fg-muted lg:table-cell">
                    {entry.comment ?
                      <span className="line-clamp-2" title={entry.comment}>
                        {entry.comment}
                      </span>
                    : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
