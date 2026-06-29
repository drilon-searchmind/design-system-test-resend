import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { CONTRACT_DEMO_REF_DATE } from "@/lib/crm/contract-utils";
import { formatCurrencyCompact } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   clientId: string;
 *   currency: string;
 *   history: Array<{ month: string; retainer: number; currency: string }>;
 * }} props
 */
export function ClientDetailRetainerTrendCard({ clientId, currency, history }) {
  const series = history?.map((h) => h.retainer) ?? [];
  const reversed = [...(history ?? [])].reverse();

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Retainer-historik
      </h2>
      <p className="mt-2 max-w-md font-sans text-[11px] leading-snug text-fg-muted">
        Historisk serie til og med april 2026 — senere månedlig rollup fra Stripe / CRM. Sidste punkt afspejler
        nuværende retainer.
      </p>
      <p className="mt-1 text-[10px] text-fg-quiet">
        Kunde-ID {clientId} · benchmark ref. kontrakter {CONTRACT_DEMO_REF_DATE}
      </p>

      {series.length > 1 ? (
        <div className="mt-4 text-agency-brand">
          <PulseSparkline data={series} height={40} />
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left font-sans text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
              <th className="py-2 pr-4 font-medium">Måned</th>
              <th className="py-2 pr-4 font-medium">Retainer</th>
              <th className="hidden py-2 font-medium sm:table-cell">Ændring</th>
            </tr>
          </thead>
          <tbody>
            {reversed.map((row, i) => {
              const newer = reversed[i + 1];
              const delta = newer ? row.retainer - newer.retainer : 0;
              return (
                <tr key={row.month} className="border-b border-border-soft last:border-0">
                  <td className="py-2 pr-4 tabular-nums text-fg-muted">{row.month}</td>
                  <td className="py-2 pr-4 tabular-nums text-fg">
                    {formatCurrencyCompact(row.retainer, row.currency ?? currency)}
                  </td>
                  <td className="hidden py-2 text-[11px] tabular-nums sm:table-cell">
                    {newer ? (
                      <span
                        className={cn(
                          delta > 0 && "text-agency-ok",
                          delta < 0 && "text-agency-bad",
                          delta === 0 && "text-fg-quiet",
                        )}
                      >
                        {delta > 0 ? `+${formatCurrencyCompact(delta, row.currency ?? currency)}` : ""}
                        {delta < 0 ? `${formatCurrencyCompact(delta, row.currency ?? currency)}` : ""}
                        {delta === 0 ? "—" : ""}
                      </span>
                    ) : (
                      <span className="text-fg-quiet">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!history?.length ? (
        <p className="mt-4 text-[13px] text-fg-muted">Ingen historik registreret for denne kunde.</p>
      ) : null}
    </div>
  );
}
