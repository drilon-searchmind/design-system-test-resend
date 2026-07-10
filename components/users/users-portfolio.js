"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { useDataSource } from "@/components/crm/use-data-source";
import { UsersDirectory } from "@/components/users/users-directory";
import { UsersPageHeader } from "@/components/users/users-page-header";
import { UsersSummaryStrip } from "@/components/users/users-summary-strip";
import { getUsersDemoBundle } from "@/lib/crm/users-demo-bundle";
import { cn } from "@/lib/utils";

export function UsersPortfolio() {
  const dataSource = useDataSource();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status");
  const rawRole = searchParams.get("role");
  const initialStatus =
    rawStatus === "invited" || rawStatus === "active" || rawStatus === "suspended" ? rawStatus : "all";
  const initialRole = rawRole === "admin" || rawRole === "standard" ? rawRole : "all";

  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        setBundle(/** @type {Record<string, unknown>} */ (getUsersDemoBundle()));
        hasLoadedRef.current = true;
      } else {
        const res = await fetch("/api/users", { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente brugere");
        setBundle(data);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const mineLabelRaw = bundle?.mineLabel;
  const mineLabel =
    typeof mineLabelRaw === "string" && mineLabelRaw.trim() ? mineLabelRaw.trim() : null;
  const myTeamMemberKeyRaw = bundle?.mineTeamMemberKey;
  const myTeamMemberKey =
    typeof myTeamMemberKeyRaw === "string" && myTeamMemberKeyRaw.trim() ?
      myTeamMemberKeyRaw.trim()
    : null;

  const statsRaw = bundle?.stats;
  const stats =
    statsRaw && typeof statsRaw === "object" ?
      /** @type {{ total: number; active: number; invited: number; suspended: number; adminish: number; withMfa: number; mfaPct: number }} */ (
        statsRaw
      )
    : {
        total: 0,
        active: 0,
        invited: 0,
        suspended: 0,
        adminish: 0,
        withMfa: 0,
        mfaPct: 0,
      };

  const users = Array.isArray(bundle?.users) ? bundle.users : [];

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <UsersPageHeader dataSource={dataSource} mineLabel={null} loading />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <UsersPageHeader dataSource={dataSource} mineLabel={null} />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <UsersPageHeader dataSource={dataSource} mineLabel={mineLabel} loading={false} />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <UsersSummaryStrip
          total={stats.total}
          active={stats.active}
          invited={stats.invited}
          suspended={stats.suspended}
          adminish={stats.adminish}
          withMfa={stats.withMfa}
          mfaPct={stats.mfaPct}
        />

        <UsersDirectory
          key={`${initialStatus}-${initialRole}-${dataSource}`}
          users={users}
          myTeamMemberKey={myTeamMemberKey}
          dataSource={dataSource}
          initialStatus={initialStatus}
          initialRole={initialRole}
        />
      </div>
    </div>
  );
}
