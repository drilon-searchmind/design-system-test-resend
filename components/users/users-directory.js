"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PulseIconChevronDown, PulseIconChevronRight, PulseIconSearch } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { AGENCY_USERS as FALLBACK_AGENCY_USERS } from "@/lib/crm/users-data";
import { agencyPlatformRoleLabel } from "@/lib/crm/users-utils";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import { cn } from "@/lib/utils";

const GRID_LIST =
  "grid-cols-[minmax(200px,2fr)_minmax(200px,1.75fr)_minmax(118px,0.95fr)_minmax(100px,0.82fr)_minmax(72px,0.55fr)_minmax(110px,0.88fr)_minmax(120px,1fr)_36px]";

function formatSeen(iso) {
  if (!iso || typeof iso !== "string") return "—";
  return formatIsoDateDa(iso.slice(0, 10));
}

/**
 * @param {{
 *   users?: import('@/lib/crm/users-data').AGENCY_USERS;
 *   myTeamMemberKey?: string | null;
 *   initialStatus?: 'all'|'active'|'invited'|'suspended';
 *   initialRole?: 'all'|'admin'|'lead'|'finance'|'member'|'readonly';
 *   headingId?: string;
 *   dataSource?: 'demo' | 'database';
 * }} props
 */
export function UsersDirectory({
  users: usersProp,
  myTeamMemberKey = null,
  initialStatus = "all",
  initialRole = "all",
  headingId = "users-directory-heading",
  dataSource = "demo",
}) {
  const users = usersProp ?? FALLBACK_AGENCY_USERS;
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState(initialStatus);
  const [roleF, setRoleF] = useState(initialRole);
  const [sort, setSort] = useState("name");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = users.filter((u) => {
      if (statusF !== "all" && u.status !== statusF) return false;
      if (roleF !== "all" && u.platformRole !== roleF) return false;
      if (ql && !`${u.name} ${u.email} ${u.departmentLabel ?? ""}`.toLowerCase().includes(ql) && !u.id.toLowerCase().includes(ql)) {
        return false;
      }
      return true;
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "role") return a.platformRole.localeCompare(b.platformRole) || a.name.localeCompare(b.name, "da");
      if (sort === "seen") return (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "");
      return a.name.localeCompare(b.name, "da");
    });
    return list;
  }, [q, statusF, roleF, sort, users]);

  const invitedCount = users.filter((u) => u.status === "invited").length;

  return (
    <section
      id="users-directory"
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:px-4">
        <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
          Brugerindeks
        </h2>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {users.length}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:max-w-[320px]">
          <label className="relative flex w-full min-w-0">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg navn, mail, id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-border-soft bg-surface-muted/30 px-3 py-2.5 md:px-4">
        <PulseSegmentedControl
          size="sm"
          active={statusF}
          onChange={setStatusF}
          tabs={[
            { id: "all", label: "Alle status" },
            { id: "active", label: "Aktiv", count: users.filter((x) => x.status === "active").length },
            { id: "invited", label: "Invitation", count: invitedCount },
            {
              id: "suspended",
              label: "Susp.",
              count: users.filter((x) => x.status === "suspended").length,
            },
          ]}
        />
        <PulseSegmentedControl
          size="sm"
          active={roleF}
          onChange={setRoleF}
          tabs={[
            { id: "all", label: "Alle roller" },
            { id: "admin", label: "Admin" },
            { id: "lead", label: "Lead" },
            { id: "finance", label: "Øko." },
            { id: "member", label: "Std." },
            { id: "readonly", label: "RO" },
          ]}
        />
      </div>

      {users.length === 0 ? (
        <p className="rounded-xl border border-border-soft bg-surface-muted/40 px-4 py-4 text-center font-sans text-[13px] leading-relaxed text-fg-muted">
          {dataSource === "database" ?
            <>
              Der er endnu ingen rækker i <span className="text-fg-soft">User</span> — typisk oprettes de automatisk
              ved Google-login. Vi opretter ikke falske brugere i seed.
            </>
          : "Ingen brugere i listen."}
        </p>
      ) : null}

      {users.length > 0 ? (
      <div className="overflow-x-auto">
        <div className="min-w-[1040px]">
          <div
            className={cn(
              "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
              "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
              GRID_LIST,
            )}
          >
            <button
              type="button"
              className="text-left font-[inherit] text-[inherit] hover:text-fg"
              onClick={() => setSort("name")}
            >
              Navn {sort === "name" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
            </button>
            <span>Email</span>
            <button
              type="button"
              className="text-left font-[inherit] text-[inherit] hover:text-fg"
              onClick={() => setSort("role")}
            >
              Rolle {sort === "role" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
            </button>
            <span>Status</span>
            <span className="text-center">MFA</span>
            <button
              type="button"
              className="text-left font-[inherit] text-[inherit] hover:text-fg"
              onClick={() => setSort("seen")}
            >
              Sidst set {sort === "seen" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
            </button>
            <span>Disciplin</span>
            <span>Roster</span>
            <span />
          </div>

          {filtered.map((u, i) => {
            const isMe =
              (myTeamMemberKey && u.teamMemberId === myTeamMemberKey) ||
              (!myTeamMemberKey && dataSource === "demo" && u.teamMemberId === TASK_DEMO_USER_ID);
            return (
              <Link
                key={u.id}
                href={`${routes.users}/${u.id}`}
                className={cn(
                  "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                  GRID_LIST,
                  i < filtered.length - 1 && "border-b border-border-soft",
                  isMe && "bg-agency-brand-soft/15",
                  u.status === "suspended" && "bg-agency-warn-soft/10",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CrmAvatar
                    label={u.avatar ?? u.name.slice(0, 2)}
                    src={u.image}
                    hue={u.hue ?? 220}
                    className="size-8 text-[11px]"
                  />
                  <div className="min-w-0">
                    <div className="font-sans text-[13px] font-semibold text-fg">{u.name}</div>
                    <div className="text-[10px] text-fg-quiet">{u.id}</div>
                  </div>
                </div>
                <span className="truncate self-center text-[11px] text-fg-muted">{u.email}</span>
                <span className="self-center font-sans text-[12px] text-fg-muted">{agencyPlatformRoleLabel(u.platformRole)}</span>
                <div className="self-center">
                  {u.status === "invited" ? (
                    <span className="inline-flex rounded border border-agency-brand-border bg-agency-brand-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-brand">
                      Invitation
                    </span>
                  ) : u.status === "suspended" ? (
                    <span className="inline-flex rounded border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-warn">
                      Susp.
                    </span>
                  ) : (
                    <span className="inline-flex rounded border border-agency-ok-border bg-agency-ok-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-ok">
                      Aktiv
                    </span>
                  )}
                </div>
                <span className="self-center text-center text-[11px] tabular-nums text-fg-muted">
                  {u.mfaEnabled ? "Ja" : "Nej"}
                </span>
                <span className="self-center text-[11px] tabular-nums text-fg-muted">{formatSeen(u.lastSeenAt)}</span>
                <div className="self-center">
                  {u.departmentLabel ? (
                    <span className="font-sans text-[11px] text-fg-muted">{u.departmentLabel}</span>
                  ) : (
                    <span className="text-[10px] text-fg-quiet">—</span>
                  )}
                </div>
                <div className="self-center">
                  {u.teamMemberId ? (
                    <span className="text-[10px] text-fg-muted">{u.teamMemberId}</span>
                  ) : (
                    <span className="text-[10px] text-fg-quiet">—</span>
                  )}
                </div>
                <div className="flex items-center justify-end self-center text-fg-quiet">
                  <PulseIconChevronRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      ) : null}

      {users.length > 0 && filtered.length === 0 ? (
        <div className="px-4 py-10 text-center font-sans text-[13px] text-fg-muted">Ingen brugere matcher filtrene.</div>
      ) : null}

      {users.length > 0 ? (
      <div className="border-t border-border px-4 py-3 font-sans text-[11px] text-fg-muted">
        Rækken med <span className="font-semibold text-agency-brand">lys baggrund</span>{" "}
        {dataSource === "database" ?
          <>
            matcher din session når <span className="">TeamMember.key</span> er knyttet til din konto.
          </>
        : (
          <>
            er markeret som din profil i eksempelvisningen (<span className="">Louise / lm</span>).
          </>
        )}
      </div>
      ) : null}
    </section>
  );
}
