import Link from "next/link";

import { routes } from "@/config/routes";
import { AGENCY_USERS } from "@/lib/crm/users-data";
import { formatIsoDateDa } from "@/lib/crm/format-da";

export function UsersInvitesQueueCard() {
  const pending = AGENCY_USERS.filter((u) => u.status === "invited").slice(0, 5);

  return (
    <section className="tally-panel p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Invitationskø</h2>
        <Link href={{ pathname: routes.users, query: { status: "invited" } }} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Filtrér liste →
        </Link>
      </div>
      {pending.length === 0 ? (
        <p className="mt-4 font-sans text-[12px] text-fg-muted">Ingen åbne invitationer.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border-soft">
          {pending.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
              <div className="min-w-0">
                <Link href={`${routes.users}/${u.id}`} className="font-sans text-[13px] font-semibold text-fg hover:text-agency-brand">
                  {u.name}
                </Link>
                <div className="text-[11px] text-fg-quiet">{u.email}</div>
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-fg-muted">
                sendt {u.invitedAt ? formatIsoDateDa(u.invitedAt) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
