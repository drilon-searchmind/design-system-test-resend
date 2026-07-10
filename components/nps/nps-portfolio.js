"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { NpsCampaignQueueCard } from "@/components/nps/nps-campaign-queue-card";
import { NpsClientsDirectory } from "@/components/nps/nps-clients-directory";
import { NpsHeroMetrics } from "@/components/nps/nps-hero-metrics";
import { NpsPageHeader } from "@/components/nps/nps-page-header";
import { NpsRecentResponsesCard } from "@/components/nps/nps-recent-responses-card";
import { NpsSecondaryMetrics } from "@/components/nps/nps-secondary-metrics";
import { NpsSettingsPanel } from "@/components/nps/nps-settings-panel";
import { NpsSendLogCard } from "@/components/nps/nps-send-log-card";
import { NpsTemplatesDirectory } from "@/components/nps/nps-templates-directory";
import { NpsTrendAndDistributionCard } from "@/components/nps/nps-trend-distribution-card";
import { getNpsDemoBundle } from "@/lib/crm/nps-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} Rp */

const SECTIONS = [
  { id: "overblik", label: "Overblik" },
  { id: "udsendelser", label: "Udsendelser" },
  { id: "konti", label: "Konti" },
  { id: "skabeloner", label: "Skabeloner" },
  { id: "indstillinger", label: "Indstillinger" },
];

export function NpsPortfolio() {
  const dataSource = useDataSource();
  const [section, setSection] = useState("overblik");
  const reportPeriod = useMemo(
    () => normalizeReportPeriod(getCurrentReportPeriod()),
    [],
  );
  const [bundle, setBundle] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const normalizedPeriod = reportPeriod;

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (dataSource === "demo") {
        setBundle(
          /** @type {Record<string, unknown>} */ (
            getNpsDemoBundle({
              year: normalizedPeriod.year,
              month: normalizedPeriod.month,
            })
          ),
        );
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery({
          year: String(normalizedPeriod.year),
          month: String(normalizedPeriod.month),
        });
        const res = await fetch(`/api/nps?${qs}`, { cache: "no-store" });
        /** @type {{ error?: string } & Record<string, unknown>} */
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke hente NPS-data");
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
  }, [dataSource, normalizedPeriod.month, normalizedPeriod.year]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const responseRateLabel =
    bundle && bundle.lastRoundCaptionDemo === true
      ? "Svarfrekvens (seneste runde)"
      : "Svarfrekvens (rapportmåned)";

  const invitationsLabel =
    bundle && bundle.lastRoundCaptionDemo === true ?
      "Invitationer sidste runde"
    : "Invitationer (måned)";

  const headerPeriodMemo = normalizedPeriod;

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <NpsPageHeader reportPeriod={headerPeriodMemo} loading />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <NpsPageHeader reportPeriod={headerPeriodMemo} />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  const dist =
    bundle.distribution && typeof bundle.distribution === "object" ?
      /** @type {{ promoters?: number; passive?: number; detractors?: number; withData?: number }} */ (
        bundle.distribution
      )
    : {};
  const lr =
    bundle.lastRound && typeof bundle.lastRound === "object" ?
      /** @type {{ invitations?: number; responses?: number; medianHoursToRespond?: number }} */ (bundle.lastRound)
    : {};
  const sendLog =
    bundle.sendLog && typeof bundle.sendLog === "object" ?
      /** @type {{ totalSent: number; totalFailed: number; recent: unknown[] }} */ (bundle.sendLog)
    : { totalSent: 0, totalFailed: 0, recent: [] };

  const clients = Array.isArray(bundle.clients) ? bundle.clients : [];
  const templates = Array.isArray(bundle.templates) ? bundle.templates : [];
  const trendLabels = Array.isArray(bundle.trendLabels) ? /** @type {string[]} */ (bundle.trendLabels) : [];
  const recentResponses = Array.isArray(bundle.recentResponses) ? bundle.recentResponses : [];
  const npsSettings =
    bundle.settings && typeof bundle.settings === "object" ?
      /** @type {{ autoSendEnabled: boolean; sendTimeLocal: string; sendDates: { month: number; day: number }[]; nextOccurrences: { isoDate: string; label: string }[] }} */ (
        bundle.settings
      )
    : null;

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <NpsPageHeader reportPeriod={normalizedPeriod} refreshing={refreshing} />

      <PulseSegmentedControl active={section} onChange={setSection} tabs={SECTIONS} />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        {section === "overblik" ?
          <>
            <NpsHeroMetrics
              avgLatest={typeof bundle.avgLatest === "number" ? bundle.avgLatest : null}
              avgPrev={typeof bundle.avgPrev === "number" ? bundle.avgPrev : null}
              measured={typeof bundle.measured === "number" ? bundle.measured : 0}
              rollupTotal={typeof bundle.rollupTotal === "number" ? bundle.rollupTotal : 0}
              atRisk={typeof bundle.atRisk === "number" ? bundle.atRisk : 0}
              responseRate={typeof bundle.responseRate === "number" ? bundle.responseRate : 0}
              responseRateLabel={responseRateLabel}
            />
            <NpsTrendAndDistributionCard
              trend={Array.isArray(bundle.trend) ? /** @type {number[]} */ (bundle.trend) : []}
              trendLabels={trendLabels}
              promoters={typeof dist.promoters === "number" ? dist.promoters : 0}
              passive={typeof dist.passive === "number" ? dist.passive : 0}
              detractors={typeof dist.detractors === "number" ? dist.detractors : 0}
              withData={typeof dist.withData === "number" ? dist.withData : 0}
            />
            <NpsSecondaryMetrics
              improving={typeof bundle.improving === "number" ? bundle.improving : 0}
              invitations={typeof lr.invitations === "number" ? lr.invitations : 0}
              responses={typeof lr.responses === "number" ? lr.responses : 0}
              medianHoursToRespond={
                typeof lr.medianHoursToRespond === "number" ? lr.medianHoursToRespond : 0
              }
              invitationsLabel={invitationsLabel}
            />
            <NpsRecentResponsesCard responses={recentResponses} />
          </>
        : null}

        {section === "udsendelser" ?
          <>
            <NpsSendLogCard
              sendLog={
                /** @type {{ totalSent: number; totalFailed: number; recent: { id: string; clientSlug: string; contactEmail: string; templateKey: string; status: string; sentAt: string; subject: string }[] }} */ (
                  sendLog
                )
              }
              clients={clients}
            />
            <NpsCampaignQueueCard
              upcomingSends={Array.isArray(bundle.upcomingSends) ? bundle.upcomingSends : []}
              clients={clients}
            />
          </>
        : null}

        {section === "konti" ?
          <NpsClientsDirectory
            clients={clients}
            templates={templates}
            onMutate={load}
            canSend={dataSource === "database"}
          />
        : null}

        {section === "skabeloner" ?
          <NpsTemplatesDirectory templates={templates} onMutate={load} canEdit={dataSource === "database"} />
        : null}

        {section === "indstillinger" ?
          <NpsSettingsPanel
            settings={npsSettings}
            onMutate={load}
            canEdit={dataSource === "database"}
          />
        : null}
      </div>
    </div>
  );
}
