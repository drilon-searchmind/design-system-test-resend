"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { NpsCampaignQueueCard } from "@/components/nps/nps-campaign-queue-card";
import { NpsClientsDirectory } from "@/components/nps/nps-clients-directory";
import { NpsInsightsCard } from "@/components/nps/nps-insights-card";
import { NpsPageHeader } from "@/components/nps/nps-page-header";
import { NpsPlaybookCard } from "@/components/nps/nps-playbook-card";
import { NpsSummaryStrip } from "@/components/nps/nps-summary-strip";
import { NpsTemplatesDirectory } from "@/components/nps/nps-templates-directory";
import { NpsTrendAndDistributionCard } from "@/components/nps/nps-trend-distribution-card";
import { getNpsDemoBundle } from "@/lib/crm/nps-demo-bundle";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {{ year: number; month: number }} Rp */

export function NpsPortfolio() {
  const dataSource = useDataSource();
  const [reportPeriod, setReportPeriod] = useState(
    /** @type {Rp} */ (normalizeReportPeriod(getCurrentReportPeriod())),
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
        const qs = new URLSearchParams({
          includeTest: "1",
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
      : "Svarfrekvens (invitationer i rapportmåned)";

  const invitationsLabel =
    bundle && bundle.lastRoundCaptionDemo === true ?
      "Invitationer sidste runde"
    : "Invitationer (sendt i måneden)";

  const headerPeriodMemo = normalizedPeriod;

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <NpsPageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          dataSource={dataSource}
          mineLabel={null}
          loading
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-3">
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
        <NpsPageHeader
          reportPeriod={headerPeriodMemo}
          onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
          dataSource={dataSource}
          mineLabel={null}
        />
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

  const mineLabelRaw = bundle.mineLabel;
  const mineLabel =
    typeof mineLabelRaw === "string" && mineLabelRaw.trim() ? mineLabelRaw.trim() : null;

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <NpsPageHeader
        reportPeriod={normalizedPeriod}
        onReportPeriodChange={(p) => setReportPeriod(normalizeReportPeriod(p))}
        dataSource={dataSource}
        mineLabel={mineLabel}
        refreshing={refreshing}
      />

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <NpsSummaryStrip
          avgLatest={typeof bundle.avgLatest === "number" ? bundle.avgLatest : null}
          avgPrev={typeof bundle.avgPrev === "number" ? bundle.avgPrev : null}
          measured={typeof bundle.measured === "number" ? bundle.measured : 0}
          rollupTotal={typeof bundle.rollupTotal === "number" ? bundle.rollupTotal : 0}
          atRisk={typeof bundle.atRisk === "number" ? bundle.atRisk : 0}
          improving={typeof bundle.improving === "number" ? bundle.improving : 0}
          promoterRatio={typeof bundle.promoterRatio === "number" ? bundle.promoterRatio : 0}
          passiveRatio={typeof bundle.passiveRatio === "number" ? bundle.passiveRatio : 0}
          detractorRatio={typeof bundle.detractorRatio === "number" ? bundle.detractorRatio : 0}
          responseRate={typeof bundle.responseRate === "number" ? bundle.responseRate : 0}
          invitations={typeof lr.invitations === "number" ? lr.invitations : 0}
          responses={typeof lr.responses === "number" ? lr.responses : 0}
          medianHoursToRespond={
            typeof lr.medianHoursToRespond === "number" ? lr.medianHoursToRespond : 0
          }
          pulseAlertCount={Array.isArray(bundle.pulseAlerts) ? bundle.pulseAlerts.length : 0}
          responseRateLabel={responseRateLabel}
          invitationsLabel={invitationsLabel}
        />

        <NpsTrendAndDistributionCard
          trend={Array.isArray(bundle.trend) ? /** @type {number[]} */ (bundle.trend) : []}
          promoters={typeof dist.promoters === "number" ? dist.promoters : 0}
          passive={typeof dist.passive === "number" ? dist.passive : 0}
          detractors={typeof dist.detractors === "number" ? dist.detractors : 0}
          withData={typeof dist.withData === "number" ? dist.withData : 0}
        />

        <div className="grid gap-[length:var(--ds-studio-stack)] xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] xl:items-start">
          <NpsCampaignQueueCard
            upcomingSends={Array.isArray(bundle.upcomingSends) ? bundle.upcomingSends : []}
            clients={Array.isArray(bundle.clients) ? bundle.clients : []}
          />
          <div className="flex min-w-0 flex-col gap-[length:var(--ds-studio-stack)]">
            <NpsInsightsCard
              alerts={
                Array.isArray(bundle.pulseAlerts) ?
                  /** @type {import('@/lib/crm/static-data').SMART_ALERTS} */ (bundle.pulseAlerts)
                : []
              }
            />
            <NpsPlaybookCard />
          </div>
        </div>

        <NpsClientsDirectory clients={Array.isArray(bundle.clients) ? bundle.clients : []} />

        <NpsTemplatesDirectory templates={Array.isArray(bundle.templates) ? bundle.templates : []} />
      </div>
    </div>
  );
}
