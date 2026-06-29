import Link from "next/link";

import { routes } from "@/config/routes";

/**
 * @param {{ deptId: string; deptName: string }} props
 */
export function TeamMemberQuickLinksCard({ deptId, deptName }) {
  return (
    <section className="tally-panel p-4 md:p-5">
      <h2 className="font-sans text-sm font-semibold text-fg">Hurtige links</h2>
      <p className="mt-1 font-sans text-[12px] text-fg-muted">Planlægning og dokumentation omkring {deptName}.</p>
      <ul className="mt-4 flex flex-col gap-2">
        <li>
          <Link
            href={routes.workload}
            className="block rounded-lg border border-border-soft bg-surface-muted/30 px-3 py-2 font-sans text-[12px] font-medium text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/20"
          >
            Workload
            <span className="ml-2 text-[10px] font-normal text-fg-quiet">kapacitet</span>
          </Link>
        </li>
        <li>
          <Link
            href={{ pathname: routes.team, query: { dept: deptId } }}
            className="block rounded-lg border border-border-soft bg-surface-muted/30 px-3 py-2 font-sans text-[12px] font-medium text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/20"
          >
            Team-roster
            <span className="ml-2 text-[10px] font-normal text-fg-quiet">{deptId}</span>
          </Link>
        </li>
        <li>
          <Link
            href={routes.kb}
            className="block rounded-lg border border-border-soft bg-surface-muted/30 px-3 py-2 font-sans text-[12px] font-medium text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/20"
          >
            Knowledge base
          </Link>
        </li>
      </ul>
    </section>
  );
}
