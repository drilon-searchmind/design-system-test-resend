import Link from "next/link";

import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

function scoreTone(score) {
  if (score == null) return "text-fg-quiet";
  const display = score <= 10 ? score * 10 : score;
  if (display >= 60) return "text-agency-ok";
  if (display >= 40) return "text-agency-warn";
  return "text-agency-bad";
}

/**
 * @param {{
 *   responses: {
 *     id: string;
 *     clientSlug: string;
 *     clientName: string;
 *     contactEmail: string;
 *     score: number | null;
 *     displayScore: number;
 *     comment: string;
 *     respondedAt: string;
 *   }[];
 * }} props
 */
export function NpsRecentResponsesCard({ responses }) {
  return (
    <section className="tally-panel overflow-hidden">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="font-sans text-sm font-semibold text-fg">Seneste svar</h2>
        <p className="mt-1 font-sans text-[11px] text-fg-muted">
          Besvarelser fra undersøgelseslinks — score 1–10 og valgfri kommentar.
        </p>
      </div>

      {responses.length === 0 ?
        <p className="px-4 py-8 text-center font-sans text-[13px] text-fg-muted md:px-5">
          Ingen besvarelser endnu — send en NPS-mail for at indsamle feedback.
        </p>
      : <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-muted/85 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                <th className="px-4 py-2.5 font-medium md:px-5">Konto</th>
                <th className="px-4 py-2.5 font-medium md:px-5">Score</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell md:px-5">Kontakt</th>
                <th className="px-4 py-2.5 font-medium md:px-5">Kommentar</th>
                <th className="px-4 py-2.5 font-medium md:px-5">Dato</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3 md:px-5">
                    <Link
                      href={`${routes.clients}/${r.clientSlug}`}
                      className="font-sans text-[12px] font-semibold text-fg hover:text-agency-brand hover:underline"
                    >
                      {r.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 md:px-5">
                    <span className={cn("font-sans text-[14px] font-semibold tabular-nums", scoreTone(r.score))}>
                      {r.score ?? "—"}
                      <span className="ml-1 text-[10px] font-normal text-fg-quiet">/10</span>
                    </span>
                    <span className="ml-2 hidden text-[10px] tabular-nums text-fg-quiet sm:inline">
                      ({r.displayScore} KPI)
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 font-sans text-[11px] text-fg-muted sm:table-cell md:px-5">
                    {r.contactEmail || "—"}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 font-sans text-[12px] leading-snug text-fg-muted md:px-5">
                    {r.comment ?
                      <span className="line-clamp-3" title={r.comment}>
                        {r.comment}
                      </span>
                    : <span className="text-fg-quiet">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-sans text-[11px] tabular-nums text-fg-muted md:px-5">
                    {r.respondedAt ? formatIsoDateDa(r.respondedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </section>
  );
}
