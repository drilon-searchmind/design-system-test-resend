"use client";

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
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";

export const CLIENT_DETAIL_TAB_IDS = /** @type {const} */ ([
  "opgaver",
  "overblik",
  "brands",
  "kundeinfo",
  "okonomi",
  "kvalitet",
]);

/** Danish labels aligned with SETTINGS stamdata tab pattern (`PulseSegmentedControl`). */
export const CLIENT_DETAIL_TAB_DEFS = [
  { id: "opgaver", label: "Opgaver" },
  { id: "overblik", label: "Overblik" },
  { id: "kundeinfo", label: "Kundeinfo" },
  { id: "okonomi", label: "Økonomi & aftale" },
  { id: "kvalitet", label: "NPS & kvalitet" },
];

/** Kun for koncerner — indsættes efter "Overblik". */
const BRANDS_TAB_DEF = { id: "brands", label: "Brands" };

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
 *   notes: Array<{ id: string; who: string; at: string; type: string; body: string }>;
 *   notesTeamMembers?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   team?: import('@/lib/crm/pulse-types').PulseTeamMember[];
 *   tasks: Array<{
 *     id: string;
 *     title: string;
 *     status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
 *     priority: 'low' | 'medium' | 'high';
 *     dueDate: string;
 *   }>;
 *   kpiTimerLabel?: string;
 *   infoMd?: string;
 *   canEditKundeinfo?: boolean;
 *   onKundeinfoSaved?: (infoMd: string) => void;
 *   kundeinfoSaveUrl?: string;
 *   onUngroupBrand?: (brandSlug: string) => Promise<void>;
 *   commercialLog?: Array<{ at: string; by: string; note: string; changes: Record<string, { from: number | null; to: number | null }> }>;
 *   onClientChanged?: () => void;
 * }} props
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
  kpiTimerLabel = "Tid brugt",
  infoMd = "",
  canEditKundeinfo = false,
  onKundeinfoSaved,
  kundeinfoSaveUrl,
  onUngroupBrand,
  commercialLog = [],
  onClientChanged,
}) {
  const isGroup = Boolean(client.isGroup);
  const tabDefs = isGroup ?
      [CLIENT_DETAIL_TAB_DEFS[0], CLIENT_DETAIL_TAB_DEFS[1], BRANDS_TAB_DEF, ...CLIENT_DETAIL_TAB_DEFS.slice(2)]
    : CLIENT_DETAIL_TAB_DEFS;
  // Alerts ligger pr. brand — vis dem under koncernens id.
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
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;
  /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    CLIENT_DETAIL_TAB_IDS.includes(/** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)) &&
    (tab !== "brands" || isGroup) ?
      /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)
    : "opgaver";

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
          <section aria-labelledby="client-tab-overblik" className={stack}>
            <h2 id="client-tab-overblik" className="sr-only">
              Overblik
            </h2>
            <ClientDetailKpiStrip
              client={client}
              timerLabel={kpiTimerLabel}
              openTaskCount={openTaskCount}
            />
            <ClientDetailMetaCard client={client} team={team ?? notesTeamMembers} />
            <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
              <ClientDetailDeliveryCard client={client} />
              <ClientDetailNotesCard notes={notes} teamMembers={notesTeamMembers} />
            </div>
            <ClientDetailServiceMixCard
              client={client}
              canEdit={canEditKundeinfo && !isGroup}
              onSaved={onClientChanged}
            />
          </section>
        ) : null}

        {resolvedTab === "opgaver" ? (
          <section aria-labelledby="client-tab-opgaver" className={stack}>
            <h2 id="client-tab-opgaver" className="sr-only">
              Opgaver
            </h2>
            <ClientDetailTasksCard tasks={tasks} clientLabel={client.name} />
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

        {resolvedTab === "kundeinfo" ? (
          <section aria-labelledby="client-tab-kundeinfo" className={stack}>
            <h2 id="client-tab-kundeinfo" className="sr-only">
              Kundeinfo
            </h2>
            <ClientDetailContactsCard
              primaryContact={client.primaryContact}
              secondaryContact={client.secondaryContact}
            />
            <ClientDetailContractCard contract={contract} isGroup={isGroup} />
            <ClientDetailKundeinfoPanel
              clientSlug={client.id}
              clientName={client.name}
              infoMd={infoMd}
              canEdit={canEditKundeinfo}
              onSaved={onKundeinfoSaved}
              saveUrl={kundeinfoSaveUrl}
            />
          </section>
        ) : null}

        {resolvedTab === "okonomi" ? (
          <section aria-labelledby="client-tab-okonomi" className={stack}>
            <h2 id="client-tab-okonomi" className="sr-only">
              Økonomi og aftale
            </h2>
            <ClientDetailCommercialEditor
              client={client}
              commercialLog={commercialLog}
              canEdit={canEditKundeinfo && !isGroup}
              onSaved={onClientChanged}
            />
            <ClientDetailUpsellsCard
              client={client}
              team={team ?? notesTeamMembers}
              canEdit={canEditKundeinfo && !isGroup}
              onSaved={onClientChanged}
            />
            <ClientDetailCommercialCard
              client={client}
              contract={contract}
              contractDetailHref={contractDetailHref}
            />
            <ClientDetailRetainerTrendCard clientId={client.id} currency={client.currency} history={retainerHistory} />
          </section>
        ) : null}

        {resolvedTab === "kvalitet" ? (
          <section aria-labelledby="client-tab-kvalitet" className={stack}>
            <h2 id="client-tab-kvalitet" className="sr-only">
              NPS og kvalitet
            </h2>
            <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ClientDetailNpsCard client={client} />
              <ClientDetailInsightsCard client={client} />
            </div>
            <ClientDetailAlertsCard clientId={client.id} alerts={visibleAlerts} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
