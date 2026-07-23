"use client";

import { ContractDetailFinanceSnapshotCard } from "@/components/contracts/contract-detail-finance-snapshot-card";
import { ContractDetailKpiStrip } from "@/components/contracts/contract-detail-kpi-strip";
import { ContractDetailLinkedClientCard } from "@/components/contracts/contract-detail-linked-client-card";
import { ContractDetailTermsCard } from "@/components/contracts/contract-detail-terms-card";

/** @deprecated Kept for callers that still import tab ids — detail is a single Overblik. */
export const CONTRACT_DETAIL_TAB_IDS = /** @type {const} */ (["overblik"]);

/**
 * Single-pane contract detail (Overblik only).
 *
 * @param {{
 *   contract: import('@/lib/crm/static-data').CONTRACTS[number] & Record<string, unknown>;
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   renewalReferenceIso: string;
 *   referenceChipLabel?: string;
 *   referenceChipValue?: string;
 *   retainerHistory: Array<{ month: string; retainer: number; currency: string }>;
 *   tab?: string;
 *   onTabChange?: (id: string) => void;
 *   revisionEntries?: unknown;
 *   tasks?: unknown;
 *   alerts?: unknown;
 * }} props
 */
export function ContractDetailTabbedBody({
  contract,
  client,
  renewalReferenceIso,
  referenceChipLabel,
  referenceChipValue,
  retainerHistory,
}) {
  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";

  return (
    <section aria-labelledby="contract-overblik" className={stack}>
      <h2 id="contract-overblik" className="sr-only">
        Overblik
      </h2>

      <ContractDetailKpiStrip
        contract={contract}
        renewalReferenceIso={renewalReferenceIso}
        referenceChipLabel={referenceChipLabel}
        referenceChipValue={referenceChipValue}
      />

      <ContractDetailTermsCard contract={contract} />

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <ContractDetailFinanceSnapshotCard history={retainerHistory} />
        <ContractDetailLinkedClientCard
          client={client}
          contract={contract}
          renewalReferenceIso={renewalReferenceIso}
        />
      </div>
    </section>
  );
}
