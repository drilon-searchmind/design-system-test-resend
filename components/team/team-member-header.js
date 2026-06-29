import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { DEPARTMENTS } from "@/lib/crm/static-data";

/**
 * @param {{
 *   member:
 *     | import('@/lib/crm/static-data').TEAM[number]
 *     | {
 *         id?: string;
 *         name?: string;
 *         role?: string;
 *         dept?: string;
 *         avatar?: string;
 *         hue?: number;
 *         weeklyHours?: number;
 *         isMe?: boolean;
 *       };
 *   department?: { id: string; name: string; short: string } | null;
 * }} props
 */
export function TeamMemberHeader({ member, department: departmentProp }) {
  const d = departmentProp ?? DEPARTMENTS.find((x) => x.id === member.dept);

  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-6">
      <nav aria-label="Brødkrummer" className="flex flex-wrap items-center gap-1 text-[11px] text-fg-quiet">
        <Link href={routes.team} className="text-fg-muted transition-colors hover:text-agency-brand">
          Team
        </Link>
        <span aria-hidden>/</span>
        {d ? (
          <>
            <Link
              href={`${routes.team}?dept=${encodeURIComponent(d.id)}`}
              className="text-fg-muted transition-colors hover:text-agency-brand"
            >
              {d.name}
            </Link>
            <span aria-hidden>/</span>
          </>
        ) : null}
        <span className="truncate text-fg-soft">{member.avatar}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <CrmAvatar label={member.avatar} hue={member.hue} className="size-16 shrink-0 text-[20px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">{member.name}</h1>
            {member.isMe ? (
              <span className="rounded border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 text-[9px] font-semibold uppercase text-agency-brand">
                Dit kort
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-sans text-[13px] text-fg-muted">{member.role}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-fg-quiet">
            <span className="rounded-full border border-border-soft px-2.5 py-0.5">
              {d?.name ?? member.dept} · {d?.short ?? member.dept}
            </span>
            <span className="rounded-full border border-border-soft px-2.5 py-0.5 tabular-nums">
              Kontrakteret {member.weeklyHours} h/uge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
