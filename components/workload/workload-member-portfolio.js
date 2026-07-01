"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { useDataSource } from "@/components/crm/use-data-source";
import { IconChart } from "@/components/crm/icons";
import { routes } from "@/config/routes";
import { getWorkloadMemberDemoBundle } from "@/lib/crm/workload-demo-bundle";
import { formatReportPeriodSubtitle, getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} ReportPeriodState */

export function WorkloadMemberPortfolio() {
  const dataSource = useDataSource();
  const params = useParams();
  const rawKey = typeof params.memberKey === "string" ? params.memberKey : "";
  const memberKey = decodeURIComponent(rawKey);

  const [reportPeriod, setReportPeriod] = useState(
    /** @type {ReportPeriodState} */ (normalizeReportPeriod(getCurrentReportPeriod())),
  );
  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const normalizedPeriod = useMemo(
    () => normalizeReportPeriod({ year: reportPeriod.year, month: reportPeriod.month }),
    [reportPeriod.month, reportPeriod.year],
  );

  const load = useCallback(async () => {
    if (!memberKey) return;
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        const b = getWorkloadMemberDemoBundle(memberKey, {
          year: normalizedPeriod.year,
          month: normalizedPeriod.month,
        });
        if (!b) throw new Error("Medarbejder ikke fundet");
        setBundle(/** @type {Record<string, unknown>} */ (b));
        hasLoadedRef.current = true;
      } else {
        const qs = new URLSearchParams({
          includeTest: "1",
          year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(
          `/api/workload/${encodeURIComponent(memberKey)}?${qs}`,
          { cache: "no-store" },
        );
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (res.status === 404 || !res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente medarbejder");
        }
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
  }, [dataSource, memberKey, normalizedPeriod.month, normalizedPeriod.year]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource, memberKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const subtitle = formatReportPeriodSubtitle(normalizedPeriod.year, normalizedPeriod.month);

  const tasksOpen =
    bundle && Array.isArray(bundle.tasksOpen) ?
      /** @type {{ key: string; title: string; clientSlug?: string; status?: string; priority?: string; dueIso?: string | null }[]} */ (
        bundle.tasksOpen
      )
    : [];

  const openStats = useMemo(() => {
    const raw =
      bundle && typeof bundle.openTaskStats === "object" && bundle.openTaskStats ? bundle.openTaskStats : {};
    const o = /** @type {Record<string, unknown>} */ (raw);
    return {
      total: typeof o.total === "number" ? o.total : 0,
      high: typeof o.high === "number" ? o.high : 0,
      overdue: typeof o.overdue === "number" ? o.overdue : 0,
    };
  }, [bundle]);

  const showSkeleton = loading && !bundle;

  const member =
    bundle && typeof bundle.member === "object" && bundle.member ?
      /** @type {{ id?: string; name?: string; role?: string; avatar?: string; hue?: number; weeklyHours?: number; isMe?: boolean }} */ (
        bundle.member
      )
    : null;

  const hoursMonth =
    bundle && typeof bundle.hoursMonth === "number" && Number.isFinite(bundle.hoursMonth) ? bundle.hoursMonth : 0;
  const billableHoursMonth =
    bundle &&
    typeof bundle.billableHoursMonth === "number" &&
    Number.isFinite(bundle.billableHoursMonth) ?
      bundle.billableHoursMonth
    : 0;

  if (!memberKey) {
    return (
      <div className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        Mangler medarbejder-nøgle i URL&apos;en.
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="h-28 animate-pulse rounded-2xl bg-skeleton" />
        <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (!loading && (error || !bundle || !member)) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <div className="flex flex-wrap gap-3">
          <Link
            href={routes.workload}
            className="font-sans text-[13px] font-medium text-agency-brand hover:underline"
          >
            ← Workload oversigt
          </Link>
        </div>
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Medarbejder ikke fundet"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
      <div className="flex flex-wrap gap-3">
        <Link href={routes.workload} className="font-sans text-[13px] font-medium text-agency-brand hover:underline">
          ← Workload oversigt
        </Link>
      </div>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconChart size={14} className="text-agency-brand" aria-hidden />
            Team workload
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <CrmAvatar
              label={typeof member.avatar === "string" ? member.avatar : "?"}
              src={typeof member.image === "string" ? member.image : undefined}
              hue={typeof member.hue === "number" ? member.hue : 220}
              className="size-12 text-[13px]"
            />
            <div className="min-w-0">
              <h1 className="font-sans text-[21px] font-semibold tracking-tight text-fg">{member.name}</h1>
              <p className="mt-0.5 font-sans text-[12px] text-fg-muted">{member.role}</p>
              <p className="mt-1 font-sans text-[12px] text-fg-muted">
                <span className="capitalize">{subtitle}</span>
                {member.isMe ? (
                  <>
                    {" · "}
                    <span className="font-semibold text-fg">Min profil</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReportPeriodPicker
            year={reportPeriod.year}
            month={reportPeriod.month}
            onChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          />
        </div>
      </header>

      <section className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-3">
        <div className="tally-panel p-4">
          <p className="text-[10px] uppercase tracking-wide text-fg-soft">Åbne opgaver</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums text-fg">{openStats.total}</p>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">
            {openStats.high} høj prio · {openStats.overdue} overskridet
          </p>
        </div>
        <div className="tally-panel p-4">
          <p className="text-[10px] uppercase tracking-wide text-fg-soft">Timer (Periode)</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums text-fg">{hoursMonth} t</p>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Alle poster i rapportmåneden</p>
        </div>
        <div className="tally-panel p-4">
          <p className="text-[10px] uppercase tracking-wide text-fg-soft">Billable</p>
          <p className="mt-2 text-[22px] font-semibold tabular-nums text-fg">{billableHoursMonth} t</p>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Ud fra flaggede poster</p>
        </div>
      </section>

      <section className="tally-panel overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-sans text-sm font-semibold text-fg">Åbne opgaver på dig</h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">Knyttet til {member.name} ({memberKey}).</p>
        </div>
        <ul className="divide-y divide-border-soft">
          {tasksOpen.length === 0 ? (
            <li className="px-4 py-8 font-sans text-[13px] text-fg-muted">Ingen åbne opgaver på denne bruger.</li>
          ) : (
            tasksOpen.map((t) => (
              <li key={t.key || t.title} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                {t.key ?
                  <Link
                    href={`${routes.tasks}/${encodeURIComponent(t.key)}`}
                    className="min-w-0 flex-1 font-sans text-[13px] font-semibold text-fg hover:text-agency-brand"
                  >
                    {t.title || t.key}
                  </Link>
                : <span className="min-w-0 flex-1 font-sans text-[13px] font-semibold text-fg">{t.title}</span>}
                <span className="text-[10px] text-fg-quiet">{t.clientSlug ?? ""}</span>
                <span className="text-[10px] text-fg-muted">{t.priority}</span>
                {t.dueIso ? (
                  <span className="text-[10px] text-fg-soft">Aflevering {t.dueIso.slice(0, 10)}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
