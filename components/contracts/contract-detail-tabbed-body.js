"use client";

import { ClientDetailAlertsCard } from "@/components/clients/client-detail-alerts-card";
import { ClientDetailTasksCard } from "@/components/clients/client-detail-tasks-card";
import { ContractDetailFinanceSnapshotCard } from "@/components/contracts/contract-detail-finance-snapshot-card";
import { ContractDetailKpiStrip } from "@/components/contracts/contract-detail-kpi-strip";
import { ContractDetailLinkedClientCard } from "@/components/contracts/contract-detail-linked-client-card";
import { ContractDetailRevisionsCard } from "@/components/contracts/contract-detail-revisions-card";
import { ContractDetailTermsCard } from "@/components/contracts/contract-detail-terms-card";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";

export const CONTRACT_DETAIL_TAB_IDS = /** @type {const} */ ([
  "overblik",
  "okonomi",
  "revisioner",
  "kunde",
  "opgaver",
]);

/** Danish labels — same control pattern as kundevisningen. */
export const CONTRACT_DETAIL_TAB_DEFS = [
  { id: "overblik", label: "Overblik" },
  { id: "okonomi", label: "Økonomi & vilkår" },
  { id: "revisioner", label: "Revision & spor" },
  { id: "kunde", label: "Kunde & risiko" },
  { id: "opgaver", label: "Opgav & follow-up" },
];

/**
 * @param {{
 *   tab: string;
 *   onTabChange: (id: string) => void;
 *   contract: import('@/lib/crm/static-data').CONTRACTS[number];
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   renewalReferenceIso: string;
 *   referenceChipLabel?: string;
 *   referenceChipValue?: string;
 *   retainerHistory: Array<{ month: string; retainer: number; currency: string }>;
 *   revisionEntries: Array<{ id: string; at: string; kind: string; summary: string }>;
 *   tasks: Array<{
 *     id: string;
 *     title: string;
 *     status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
 *     priority: 'low' | 'medium' | 'high';
 *     dueDate: string;
 *   }>;
 *   alerts: Array<{
 *     id: string;
 *     severity: string;
 *     title: string;
 *     body: string;
 *     age: string;
 *     client?: string | null;
 *   }>;
 * }} props
 */
export function ContractDetailTabbedBody({
  tab,
  onTabChange,
  contract,
  client,
  renewalReferenceIso,
  referenceChipLabel,
  referenceChipValue,
  retainerHistory,
  revisionEntries,
  tasks,
  alerts,
}) {
  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";
  /** @type {(typeof CONTRACT_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    CONTRACT_DETAIL_TAB_IDS.includes(/** @type {(typeof CONTRACT_DETAIL_TAB_IDS)[number]} */ (tab)) ?
      /** @type {(typeof CONTRACT_DETAIL_TAB_IDS)[number]} */ (tab)
    : "overblik";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Sektion
        </p>
        <nav aria-label="Kontrakt-undersektioner">
          <PulseSegmentedControl
            size="sm"
            active={resolvedTab}
            onChange={onTabChange}
            tabs={CONTRACT_DETAIL_TAB_DEFS}
            className="max-w-full"
          />
        </nav>
      </div>

      <div role="tabpanel" className="min-w-0">
        {resolvedTab === "overblik" ? (
          <section aria-labelledby="contract-tab-overblik" className={stack}>
            <h2 id="contract-tab-overblik" className="sr-only">
              Overblik
            </h2>
            <ContractDetailKpiStrip
              contract={contract}
              renewalReferenceIso={renewalReferenceIso}
              referenceChipLabel={referenceChipLabel}
              referenceChipValue={referenceChipValue}
            />
          </section>
        ) : null}

        {resolvedTab === "okonomi" ? (
          <section aria-labelledby="contract-tab-okonomi" className={stack}>
            <h2 id="contract-tab-okonomi" className="sr-only">
              Økonomi og vilkår
            </h2>
            <ContractDetailTermsCard contract={contract} />
            <ContractDetailFinanceSnapshotCard history={retainerHistory} />
          </section>
        ) : null}

        {resolvedTab === "revisioner" ? (
          <section aria-labelledby="contract-tab-revisioner" className={stack}>
            <h2 id="contract-tab-revisioner" className="sr-only">
              Revision og spor
            </h2>
            <ContractDetailRevisionsCard entries={revisionEntries} />
          </section>
        ) : null}

        {resolvedTab === "kunde" ? (
          <section aria-labelledby="contract-tab-kunde" className={stack}>
            <h2 id="contract-tab-kunde" className="sr-only">
              Kunde og risiko
            </h2>
            <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <ContractDetailLinkedClientCard
                client={client}
                contract={contract}
                renewalReferenceIso={renewalReferenceIso}
              />
              <ClientDetailAlertsCard clientId={client.id} alerts={alerts} />
            </div>
          </section>
        ) : null}

        {resolvedTab === "opgaver" ? (
          <section aria-labelledby="contract-tab-opgaver" className={stack}>
            <h2 id="contract-tab-opgaver" className="sr-only">
              Opgav og follow-up
            </h2>
            <ClientDetailTasksCard
              tasks={tasks}
              clientLabel={client.name}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
