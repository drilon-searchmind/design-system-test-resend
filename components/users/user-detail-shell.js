"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ClientDetailEditActions } from "@/components/clients/client-detail-edit-actions";
import { useDataSource } from "@/components/crm/use-data-source";
import { UserDetailEditForm } from "@/components/users/user-detail-edit-form";
import { UsersAccountHeader, UsersAccountMetaCard } from "@/components/users/users-account-detail";
import { routes } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { TEAM } from "@/lib/crm/static-data";
import { accessTierLabel, editDraftToPatch, userDetailToEditDraft } from "@/lib/crm/user-edit-utils";
import { getAgencyUserById, agencyPlatformRoleLabel } from "@/lib/crm/users-utils";
import { cn } from "@/lib/utils";

/**
 * @param {{ userId: string }} props
 */
export function UserDetailShell({ userId }) {
  const router = useRouter();
  const dataSource = useDataSource();

  const [remote, setRemote] = useState(/** @type {import('@/lib/crm/user-edit-utils').UserDetailRow | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(/** @type {import('@/lib/crm/user-edit-utils').UserEditDraft | null} */ (null));
  const [saving, setSaving] = useState(false);
  const [editNotice, setEditNotice] = useState(/** @type {string | null} */ (null));

  const demoUser = dataSource === "demo" ? getAgencyUserById(userId) : null;
  const demoTeam = demoUser?.teamMemberId ? TEAM.find((t) => t.id === demoUser.teamMemberId) : null;

  const loadRemote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente bruger");
      setRemote(/** @type {import('@/lib/crm/user-edit-utils').UserDetailRow} */ (data.user));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  const startEdit = useCallback(() => {
    if (!remote) return;
    setDraft(userDetailToEditDraft(remote));
    setEditNotice(null);
    setEditing(true);
  }, [remote]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setEditNotice(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setEditNotice("Navn er påkrævet.");
      return;
    }
    if (!draft.email.trim()) {
      setEditNotice("Email er påkrævet.");
      return;
    }

    setSaving(true);
    setEditNotice(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraftToPatch(draft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      setRemote(/** @type {import('@/lib/crm/user-edit-utils').UserDetailRow} */ (data.user));
      setEditing(false);
      setDraft(null);
      router.refresh();
    } catch (e) {
      setEditNotice(e instanceof Error ? e.message : "Fejl ved gem");
    } finally {
      setSaving(false);
    }
  }, [draft, userId, router]);

  if (dataSource === "demo") {
    if (!demoUser) {
      return (
        <div className="tally-panel p-6">
          <p className="font-sans text-[13px] text-fg-muted">Bruger ikke fundet.</p>
          <Link href={routes.users} className="mt-3 inline-block text-[13px] text-agency-brand hover:underline">
            ← Brugerstyring
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <UsersAccountHeader user={demoUser} showBorder />
        {demoTeam ? (
          <section className="tally-panel p-4 md:p-5">
            <h2 className="font-sans text-sm font-semibold text-fg">Team roster (demo)</h2>
            <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
              <Row label="Rolle" value={demoTeam.role} />
              <Row label="Disciplin" value={demoTeam.dept} />
              <Row label="Timer/uge" value={String(demoTeam.weeklyHours)} />
            </dl>
          </section>
        ) : null}
        <UsersAccountMetaCard user={demoUser} />
        <p className="font-sans text-[12px] text-fg-quiet">
          Redigering er kun tilgængelig i database-tilstand.
        </p>
      </div>
    );
  }

  if (loading && !remote) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="h-32 animate-pulse rounded-xl bg-skeleton" />
        <div className="h-48 animate-pulse rounded-xl bg-skeleton" />
      </div>
    );
  }

  if (error && !remote) {
    return (
      <div className="tally-panel p-6">
        <p className="font-sans text-[13px] text-agency-bad">{error}</p>
        <button
          type="button"
          onClick={() => void loadRemote()}
          className="mt-3 font-sans text-[13px] text-agency-brand hover:underline"
        >
          Prøv igen
        </button>
      </div>
    );
  }

  if (!remote) return null;

  const headerUser = {
    id: remote.id,
    email: remote.email,
    name: remote.name,
    image: remote.image,
    avatar: remote.avatarInitials,
    hue: remote.hue,
    platformRole: remote.platformRole,
    status: remote.status,
    teamMemberId: remote.teamMemberKey,
    departmentLabel: remote.departmentLabel,
    mfaEnabled: remote.mfaEnabled,
    lastSeenAt: remote.lastSeenAt,
    invitedAt: remote.invitedAt,
    provisionedVia: remote.provisionedVia,
  };

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <UsersAccountHeader user={headerUser} />
          <ClientDetailEditActions
            editing={editing}
            saving={saving}
            onEdit={startEdit}
            onSave={() => void saveEdit()}
            onCancel={cancelEdit}
          />
        </div>
        {editNotice ? <p className="font-sans text-[12px] text-agency-bad">{editNotice}</p> : null}
      </div>

      {editing && draft ?
        <UserDetailEditForm draft={draft} onChange={setDraft} />
      : <>
          <UsersAccountMetaCard user={headerUser} />
          <section className="tally-panel p-4 md:p-5">
            <h2 className="font-sans text-sm font-semibold text-fg">Team roster</h2>
            <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
              <Row label="Roster-nøgle" value={remote.teamMemberKey ?? "—"} />
              <Row label="Rolle" value={remote.roleTitle || "—"} />
              <Row label="Primær disciplin" value={remote.departmentKey || "—"} />
              <Row label="Discipliner" value={remote.departmentLabel ?? "—"} />
              <Row label="Avatar" value={remote.avatarInitials} />
              <Row label="Hue" value={String(remote.hue)} />
              <Row label="Timer/uge" value={String(remote.weeklyHours)} />
              <Row label="Aktiv" value={remote.active ? "Ja" : "Nej"} />
              <Row label="ClickUp member-id" value={remote.clickUpMemberId || "—"} />
            </dl>
          </section>
          <section className="tally-panel p-4 md:p-5">
            <h2 className="font-sans text-sm font-semibold text-fg">Auth</h2>
            <dl className="mt-3 space-y-2 font-sans text-[12px] text-fg-muted">
              <Row label="Bruger-id" value={remote.id} mono />
              <Row label="Email" value={remote.email} />
              <Row label="Adgangsniveau" value={accessTierLabel(remote.accessTier)} />
              <Row label="Platform-rolle" value={agencyPlatformRoleLabel(remote.platformRole)} />
              {remote.image ? <Row label="Profilbillede" value={remote.image} /> : null}
            </dl>
          </section>
        </>
      }
    </div>
  );
}

/** @param {{ label: string; value: string; mono?: boolean }} props */
function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-fg-soft">{label}</dt>
      <dd className={cn("max-w-[60%] truncate text-right font-medium text-fg", mono && "font-mono text-[11px]")}>
        {value}
      </dd>
    </div>
  );
}
