import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { knowledgeContributorCounts } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @param {{ className?: string }} props */
export function KbContributorsCard({ className }) {
  const rows = knowledgeContributorCounts();

  return (
    <div
      className={cn(
        "tally-panel p-4 md:p-[length:var(--ds-studio-pad-main)]",
        className,
      )}
    >
      <h2 className="font-sans text-sm font-semibold text-fg">Top bidragsydere</h2>
      <p className="mt-1 font-sans text-[12px] text-fg-muted">Publicerede artikler pr. forfatter.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.slice(0, 6).map(({ authorId, count }) => {
          const member = TEAM.find((m) => m.id === authorId);
          return (
            <li key={authorId}>
              <Link
                href={{ pathname: "/kb", query: { author: authorId } }}
                className="flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-border-soft hover:bg-surface-muted/50"
              >
                {member ? (
                  <CrmAvatar label={member.avatar} hue={member.hue} className="size-[30px] shrink-0 text-[10px]" />
                ) : (
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-md border border-border text-[10px] text-fg-quiet">
                    ?
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[12px] font-medium text-fg">{member?.name ?? authorId}</div>
                  <div className="truncate text-[10px] text-fg-quiet">{member?.role}</div>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-agency-brand">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 border-t border-border-soft pt-3 text-[10px] text-fg-soft">
        Link til{" "}
        <Link href={routes.team} className="text-agency-brand hover:underline">
          Team
        </Link>{" "}
        for fuld roster.
      </p>
    </div>
  );
}
