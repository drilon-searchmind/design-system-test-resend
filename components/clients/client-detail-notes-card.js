import { CrmAvatar } from "@/components/crm/crm-avatar";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   notes: Array<{ id: string; who: string; at: string; type: string; body: string }>;
 *   teamMembers?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 * }} props
 */
export function ClientDetailNotesCard({ notes, teamMembers }) {
  const roster = teamMembers?.length ? teamMembers : TEAM;
  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Seneste noter
      </h2>
      <ul className="mt-4 flex flex-col gap-3 font-sans text-sm">
        {notes.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-6 text-center text-[13px] text-fg-muted">
            Ingen noter endnu — tilføj aktivitet i CRM for at se feed her.
          </li>
        ) : (
          notes.map((n) => {
            const author = roster.find((t) => t.id === n.who);
            return (
              <li
                key={n.id}
                className="rounded-xl border border-border-soft bg-surface-muted/25 p-3 transition-colors hover:border-agency-brand-border/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {author ? (
                    <div className="flex items-center gap-1.5">
                      <CrmAvatar label={author.avatar} hue={author.hue} className="size-6 text-[8px]" />
                      <span className="font-sans text-[12px] font-medium text-fg">{author.name}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase text-fg-quiet">{n.who}</span>
                  )}
                  <span className="text-fg-quiet">·</span>
                  <span className="text-[10px] tabular-nums text-fg-quiet">{n.at}</span>
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                      n.type === "alert" &&
                        "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
                      n.type === "call" && "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
                      n.type === "meeting" &&
                        "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
                      n.type !== "alert" &&
                        n.type !== "call" &&
                        n.type !== "meeting" &&
                        "border-border bg-surface-muted text-fg-muted",
                    )}
                  >
                    {n.type}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-[13px] text-fg-muted">{n.body}</p>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
