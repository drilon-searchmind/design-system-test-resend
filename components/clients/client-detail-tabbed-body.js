"use client";

import { ClientDetailKundeinfoPanel } from "@/components/clients/client-detail-kundeinfo-panel";
import { ClientDetailAlertsCard } from "@/components/clients/client-detail-alerts-card";
import { ClientDetailCommercialCard } from "@/components/clients/client-detail-commercial-card";
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
  "overblik",
  "kundeinfo",
  "okonomi",
  "kvalitet",
]);

/** Danish labels aligned with SETTINGS stamdata tab pattern (`PulseSegmentedControl`). */
export const CLIENT_DETAIL_TAB_DEFS = [
  { id: "overblik", label: "Overblik" },
  { id: "kundeinfo", label: "Kundeinfo" },
  { id: "okonomi", label: "Økonomi & aftale" },
  { id: "kvalitet", label: "Kvalitet & risiko" },
];

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
  kpiTimerLabel = "Timer denne md",
  infoMd = "",
  canEditKundeinfo = false,
  onKundeinfoSaved,
}) {
  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";
  /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    CLIENT_DETAIL_TAB_IDS.includes(/** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)) ?
      /** @type {(typeof CLIENT_DETAIL_TAB_IDS)[number]} */ (tab)
    : "overblik";

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
            tabs={CLIENT_DETAIL_TAB_DEFS}
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
            <ClientDetailKpiStrip client={client} timerLabel={kpiTimerLabel} />
            <ClientDetailMetaCard client={client} team={team ?? notesTeamMembers} />
            <ClientDetailDeliveryCard client={client} />
            <ClientDetailServiceMixCard client={client} />
            <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
              <ClientDetailContactsCard
                primaryContact={client.primaryContact}
                secondaryContact={client.secondaryContact}
              />
              <div className={stack}>
                <ClientDetailNotesCard notes={notes} teamMembers={notesTeamMembers} />
                <ClientDetailTasksCard tasks={tasks} clientLabel={client.name} />
              </div>
            </div>
          </section>
        ) : null}

        {resolvedTab === "kundeinfo" ? (
          <section aria-labelledby="client-tab-kundeinfo" className={stack}>
            <h2 id="client-tab-kundeinfo" className="sr-only">
              Kundeinfo
            </h2>
            <ClientDetailKundeinfoPanel
              clientSlug={client.id}
              clientName={client.name}
              infoMd={infoMd}
              canEdit={canEditKundeinfo}
              onSaved={onKundeinfoSaved}
            />
          </section>
        ) : null}

        {resolvedTab === "okonomi" ? (
          <section aria-labelledby="client-tab-okonomi" className={stack}>
            <h2 id="client-tab-okonomi" className="sr-only">
              Økonomi og aftale
            </h2>
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
              Kvalitet og risiko
            </h2>
            <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ClientDetailNpsCard client={client} />
              <ClientDetailInsightsCard client={client} />
            </div>
            <ClientDetailAlertsCard clientId={client.id} alerts={alerts} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
