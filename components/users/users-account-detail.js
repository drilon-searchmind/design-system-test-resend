import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { agencyPlatformRoleLabel } from "@/lib/crm/users-utils";

/** @typedef {typeof import('@/lib/crm/users-data').AGENCY_USERS[number]} AgencyUserRow */

/**
 * @param {{ user: AgencyUserRow; showBorder?: boolean }} props
 */
export function UsersAccountHeader({ user, showBorder = false }) {
  return (
    <div className={showBorder ? "flex flex-col gap-4 border-b border-border/70 pb-6" : "flex min-w-0 flex-col gap-4"}>
      <nav aria-label="Brødkrummer" className="flex flex-wrap items-center gap-1 text-[11px] text-fg-quiet">
        <Link href={routes.users} className="text-fg-muted transition-colors hover:text-agency-brand">
          Brugerstyring
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-fg-soft">{user.id}</span>
      </nav>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <CrmAvatar
            label={user.avatar ?? user.name.slice(0, 2)}
            src={user.image}
            hue={user.hue ?? 220}
            className="size-12 text-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">{user.name}</h1>
              {user.status === "invited" ? (
                <span className="rounded border border-agency-brand-border bg-agency-brand-soft px-2 py-0.5 text-[9px] font-semibold uppercase text-agency-brand">
                  Invitation
                </span>
              ) : null}
              {user.status === "suspended" ? (
                <span className="rounded border border-agency-warn-border bg-agency-warn-soft px-2 py-0.5 text-[9px] font-semibold uppercase text-agency-warn">
                  Suspenderet
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-fg-muted">{user.email}</p>
            <p className="mt-1 font-sans text-[13px] text-fg-muted">
              Platform-rolle: <span className="font-semibold text-fg">{agencyPlatformRoleLabel(user.platformRole)}</span>
            </p>
            {user.teamMemberId ? (
              <p className="mt-2 font-sans text-[12px] text-fg-muted">
                Roster:&nbsp;
                <span className="font-medium text-fg">{user.teamMemberId}</span>
                {user.departmentLabel ? (
                  <>
                    {" "}
                    · Disciplin{" "}
                    <span className="font-medium text-fg">{user.departmentLabel}</span>
                  </>
                ) : null}
                {" · "}
                <Link href={routes.team} className="text-agency-brand hover:underline">
                  Team-hub
                </Link>
              </p>
            ) : (
              <p className="mt-2 font-sans text-[12px] text-fg-quiet">Ikke linket til team-roster.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ user: AgencyUserRow }} props
 */
export function UsersAccountMetaCard({ user }) {
  const provLabel =
    user.provisionedVia === "invite"
      ? "Invitation"
      : user.provisionedVia === "admin_seed"
        ? "Seed / admin"
        : "Workspace Google SSO";

  return (
    <section className="tally-panel p-4 md:p-5">
      <h2 className="font-sans text-sm font-semibold text-fg">Konto</h2>
      <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">MFA</dt>
          <dd className="font-medium text-fg">{user.mfaEnabled ? "Aktiveret" : "Ikke krævet"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Provisionering</dt>
          <dd className="font-medium text-fg">{provLabel}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fg-soft">Sidst set</dt>
          <dd className="font-medium tabular-nums text-fg">
            {user.lastSeenAt ? formatIsoDateDa(user.lastSeenAt.slice(0, 10)) : "—"}
          </dd>
        </div>
        {user.invitedAt ? (
          <div className="flex justify-between gap-2">
            <dt className="text-fg-soft">Inviteret</dt>
            <dd className="font-medium tabular-nums text-fg">{formatIsoDateDa(user.invitedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
