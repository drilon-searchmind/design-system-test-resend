"use client";

import { useSession } from "next-auth/react";

import { ClientDetailUpsellsCard } from "@/components/clients/client-detail-upsells-card";
import { ClientDetailBrandsPanel } from "@/components/clients/client-detail-brands-panel";
import { ClientDetailKundeinfoPanel } from "@/components/clients/client-detail-kundeinfo-panel";
import { ClientDetailAlertsCard } from "@/components/clients/client-detail-alerts-card";
import { ClientDetailCommercialEditor } from "@/components/clients/client-detail-commercial-editor";
import { ClientDetailCommercialCard } from "@/components/clients/client-detail-commercial-card";
import { ClientDetailContractCard } from "@/components/clients/client-detail-contract-card";
import { ClientDetailContactsCard } from "@/components/clients/client-detail-contacts-card";
import { ClientDetailDeliveryCard } from "@/components/clients/client-detail-delivery-card";
import { ClientDetailInsightsCard } from "@/components/clients/client-detail-insights-card";
import { ClientDetailKpiStrip } from "@/components/clients/client-detail-kpi-strip";
import { ClientDetailMetaCard } from "@/components/clients/client-detail-meta-card";
import { ClientDetailNotesCard } from "@/components/clients/client-detail-notes-card";
import { ClientDetailNpsCard } from "@/components/clients/client-detail-nps-card";
import { ClientDetailRetainerTrendCard } from "@/components/clients/client-detail-retainer-trend-card";
import { ClientDetailServiceMixCard } from "@/components/clients/client-detail-service-mix-card";
import { ClientDetailTasksCard } from "@/components/clients/client-detail-tasks-card";
import { TovWorkspace } from "@/components/tov/tov-workspace";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";

export const CLIENT_DETAIL_TAB_IDS = /** @type {const} */ (["opgaver", "overblik", "brands", "tov"]);

/** Danish labels aligned with SETTINGS stamdata tab pattern (`PulseSegmentedControl`). */
export const CLIENT_DETAIL_TAB_DEFS = [
  { id: "opgaver", label: "Opgaver" },
  { id: "overblik", label: "Overblik" },
  { id: "tov", label: "Brand Core" },
];

/** Kun for kundegrupper — indsættes efter "Overblik". */
const BRANDS_TAB_DEF = { id: "brands", label: "Brands" };

/**
 * Overskrift for en sektion i Overblik (tidligere egne faner).
 * @param {{ id: string; title: string; children: import('react').ReactNode }} props
 */
function OverviewSection({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <h2
        id={id}
        className="border-b border-border/60 pb-2 pt-2 font-sans text-[13px] font-semibold tracking-[-0.01em] text-fg"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * @param {{
 *   tab: string;
 *   onTabChange: (id: string) => void;
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   contract:
 *     | {
 *         id: string;
 *         kind: string;
 *         monthlyValue: number;
 *         currency: string;
 *         renewalAt: string;
 *         accountStatus: string;
 *         noticeDays: number;
 *         documentUrl?: string | null;
 *         signedBy?: string | null;
 *       }
 *     | null | undefined;
 *   contractDetailHref?: string | null;
 *   retainerHistory: Array<{ month: string; retainer: number; currency: string }>;
 *   alerts: Array<{
 *     id: string;
 *     severity: string;
 *     title: string;
 *     body: string;
 *     age: string;
 *     client?: string | null;
 *   }>;
 *   notes: import('@/lib/crm/client-notes').ClientNoteItem[];
 *   notesTeamMembers?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   team?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   tasks: Array<{
 *     id: string;
 *     title: string;
 *     status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
 *     priority: 'low' | 'medium' | 'high';
 *     dueDate: string;
 *     dept?: string;
 *     estimateHours?: number | null;
 *   }>;
 *   departments?: Array<{ id: string; name: string; short?: string }>;
 *   trends?: import('@/components/clients/client-detail-kpi-strip').ClientKpiTrends | null;
 *   periodLabel?: string;
 *   kpiTimerLabel?: string;
 *   infoMd?: string;
 *   canEditKundeinfo?: boolean;
 *   onKundeinfoSaved?: (infoMd: string) => void;
 *   kundeinfoSaveUrl?: string;
 *   onUngroupBrand?: (brandSlug: string) => Promise<void>;
 *   commercialLog?: Array<{ at: string; by: string; note: string; changes: Record<string, { from: number | null; to: number | null }> }>;
 *   onClientChanged?: () => void;
 * }} props `canEditKundeinfo` = database-tilstand (demo er skrivebeskyttet).
 */
export function ClientDetailTabbedBody({
  tab,
  onTabChange,
  client,
  contract,
  contractDetailHref,
  retainerHistory,
  alerts,
  notes,
  notesTeamMembers,
  team,
  tasks,
  departments,
  trends,
  periodLabel,
  kpiTimerLabel = "Tid brugt",
  infoMd = "",
  canEditKundeinfo = false,
  onKundeinfoSaved,
  kundeinfoSaveUrl,
  onUngroupBrand,
  commercialLog = [],
  onClientChanged,
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const isGroup = Boolean(client.isGroup);
  const canEditClient = canEditKundeinfo && !isGroup;
  const tabDefs = isGroup ?
      [CLIENT_DETAIL_TAB_DEFS[0], CLIENT_DETAIL_TAB_DEFS[1], BRANDS_TAB_DEF, ...CLIENT_DETAIL_TAB_DEFS.slice(2)]
    : CLIENT_DETAIL_TAB_DEFS;
  // Alerts ligger pr. brand — vis dem under kundegruppens id.
  const visibleAlerts =
    isGroup ?
      (() => {
        const brandIds = new Set((client.brands ?? []).map((b) => b.id));
        return alerts
          .filter((a) => a.client && brandIds.has(a.client))
          .map((a) => ({ ...a, client: client.id }));
      })()
    : alerts;
  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";
  const roster = team ?? notesTeamMembers;
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;
  /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    CLIENT_DETAIL_TAB_IDS.includes(/** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)) &&
    (tab !== "brands" || isGroup) ?
      /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)
    : "opgaver";
  const notesDisabledHint =
    isGroup ? "Tilføj noter på det enkelte brand."
    : canEditKundeinfo ? undefined
    : "Noter kan kun tilføjes, når datakilden er database.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Sektion
        </p>
        <nav aria-label="Kunde-undersektioner">
          <PulseSegmentedControl
            size="sm"
            active={resolvedTab}
            onChange={onTabChange}
            tabs={tabDefs}
            className="max-w-full"
          />
        </nav>
      </div>

      <div role="tabpanel" className="min-w-0">
        {resolvedTab === "overblik" ? (
          <div className="flex flex-col gap-8">
            <section aria-labelledby="client-tab-overblik" className={stack}>
              <h2 id="client-tab-overblik" className="sr-only">
                Overblik
              </h2>
              <ClientDetailKpiStrip
                client={client}
                timerLabel={kpiTimerLabel}
                openTaskCount={openTaskCount}
                trends={trends}
                canEditRetainer={canEditClient && isAdmin}
                onClientChanged={onClientChanged}
              />
              <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
                <ClientDetailDeliveryCard
                  client={client}
                  tasks={tasks}
                  periodLabel={periodLabel}
                  canEdit={canEditClient}
                  onSaved={onClientChanged}
                />
                <ClientDetailNotesCard
                  notes={notes}
                  teamMembers={notesTeamMembers}
                  clientSlug={client.id}
                  canCreate={canEditClient}
                  disabledHint={notesDisabledHint}
                  onCreated={onClientChanged}
                  showAllHref={isGroup ? null : undefined}
                />
              </div>
            </section>

            <OverviewSection id="client-section-kundeinfo" title="Kundeinfo">
              <ClientDetailMetaCard
                client={client}
                team={roster}
                canEdit={canEditClient}
                onSaved={onClientChanged}
              />
              <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
                <ClientDetailContactsCard
                  primaryContact={client.primaryContact}
                  secondaryContact={client.secondaryContact}
                  clientSlug={client.id}
                  canEdit={canEditClient}
                  onSaved={onClientChanged}
                />
                <ClientDetailContractCard contract={contract} isGroup={isGroup} />
              </div>
              <ClientDetailKundeinfoPanel
                clientSlug={client.id}
                clientName={client.name}
                infoMd={infoMd}
                canEdit={canEditKundeinfo}
                onSaved={onKundeinfoSaved}
                saveUrl={kundeinfoSaveUrl}
              />
            </OverviewSection>

            <OverviewSection id="client-section-okonomi" title="Økonomi & aftale">
              <ClientDetailCommercialEditor
                client={client}
                commercialLog={commercialLog}
                canEdit={canEditClient && isAdmin}
                onSaved={onClientChanged}
              />
              <ClientDetailUpsellsCard
                client={client}
                team={roster}
                canEdit={canEditClient}
                onSaved={onClientChanged}
              />
              <ClientDetailCommercialCard
                client={client}
                contract={contract}
                contractDetailHref={contractDetailHref}
              />
              <ClientDetailRetainerTrendCard clientId={client.id} currency={client.currency} history={retainerHistory} />
              <ClientDetailServiceMixCard client={client} canEdit={canEditClient} onSaved={onClientChanged} />
            </OverviewSection>

            <OverviewSection id="client-section-kvalitet" title="NPS & kvalitet">
              <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ClientDetailNpsCard client={client} />
                <ClientDetailInsightsCard client={client} />
              </div>
              <ClientDetailAlertsCard clientId={client.id} alerts={visibleAlerts} />
            </OverviewSection>
          </div>
        ) : null}

        {resolvedTab === "opgaver" ? (
          <section aria-labelledby="client-tab-opgaver" className={stack}>
            <h2 id="client-tab-opgaver" className="sr-only">
              Opgaver
            </h2>
            <ClientDetailTasksCard
              tasks={tasks}
              clientLabel={client.name}
              team={roster ?? []}
              departments={departments}
            />
          </section>
        ) : null}

        {resolvedTab === "brands" && isGroup ? (
          <section aria-labelledby="client-tab-brands" className={stack}>
            <h2 id="client-tab-brands" className="sr-only">
              Brands
            </h2>
            <ClientDetailBrandsPanel
              brands={client.brands ?? []}
              groupName={client.name}
              currency={client.currency}
              totalRetainer={client.retainer}
              onUngroup={onUngroupBrand}
            />
          </section>
        ) : null}

        {resolvedTab === "tov" ? (
          <section aria-labelledby="client-tab-tov" className={stack}>
            <h2 id="client-tab-tov" className="sr-only">
              Brand Core
            </h2>
            <TovWorkspace clientKey={client.id} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
