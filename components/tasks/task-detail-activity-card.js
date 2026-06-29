import { CrmAvatar } from "@/components/crm/crm-avatar";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @param {string} raw */
function formatActivityAt(raw) {
  const [datePart, rest] = raw.trim().split(/\s+/);
  if (!rest) return formatIsoDateDa(datePart);
  return `${formatIsoDateDa(datePart)} · ${rest}`;
}

/**
 * @param {{
 *   entries: Array<{ id: string; at: string; kind: string; body?: string; summary?: string; actorId?: string }>;
 *   footnote?: string;
 * }} props
 */
export function TaskDetailActivityCard({ entries, footnote }) {
  const sorted = [...entries].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Aktivitetslog</h2>
      {footnote ? (
        <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">{footnote}</p>
      ) : null}
      <ul className="mt-4 flex flex-col gap-3">
        {sorted.length === 0 ?
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-8 text-center text-[13px] text-fg-muted">
            Ingen logposter for denne opgave.
          </li>
        : sorted.map((row) => {
            const actor = row.actorId ? TEAM.find((t) => t.id === row.actorId) : null;
            const body = row.body ?? row.summary ?? "";
            return (
              <li key={row.id} className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-fg-quiet">
                  <span className="tabular-nums">{formatActivityAt(row.at)}</span>
                  <span>·</span>
                  <span className="font-semibold uppercase tracking-wide text-fg-soft">{row.kind}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {actor ?
                    <CrmAvatar label={actor.avatar} hue={actor.hue} className="size-8 shrink-0 text-[11px]" />
                  : null}
                  <p className={cn("leading-relaxed text-[13px] text-fg-muted", actor ? "min-w-0 pt-1" : "w-full")}>
                    {body}
                  </p>
                </div>
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}
