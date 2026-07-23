"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  ContractDetailTabbedBody,
} from "@/components/contracts/contract-detail-tabbed-body";
import { ContractDetailActions } from "@/components/contracts/contract-detail-actions";
import { ContractDetailHeader } from "@/components/contracts/contract-detail-header";
import { useDataSource } from "@/components/crm/use-data-source";
import { contractDaysUntilRenewal, CONTRACT_DEMO_REF_DATE } from "@/lib/crm/contract-utils";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { routes } from "@/config/routes";
import {
  CLIENTS,
  CONTRACTS,
  RETAINER_HISTORY,
  TEAM,
} from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/**
 * @param {{ contractId: string }} props
 */
export function ContractDetailShell({ contractId }) {
  const dataSource = useDataSource();
  const [remote, setRemote] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const loadRemote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/contracts/${encodeURIComponent(contractId)}?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente kontrakt");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  const demoCtr = CONTRACTS.find((c) => c.id === contractId);
  const renewalRefDemo = CONTRACT_DEMO_REF_DATE;

  if (dataSource === "demo" && !demoCtr) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen kontrakt med id <span className="text-fg">{contractId}</span>.{" "}
          <Link href={routes.contracts} className="text-agency-brand hover:underline">
            Tilbage til Kontrakter
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "demo" && demoCtr) {
    const client = CLIENTS.find((c) => c.id === demoCtr.clientId);
    if (!client) {
      return (
        <p className="font-sans text-[13px] text-fg-muted">
          Mangler tilknyttet kunde. <Link href={routes.contracts}>Tilbage</Link>
        </p>
      );
    }

    const owner = TEAM.find((t) => t.id === demoCtr.ownerId);
    const retainerHist = RETAINER_HISTORY[demoCtr.clientId] ?? [];
    const daysUntilRenewal = contractDaysUntilRenewal(demoCtr.renewalAt, renewalRefDemo);

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <ContractDetailHeader
          contract={{
            id: demoCtr.id,
            kind: demoCtr.kind,
            clientName: demoCtr.clientName,
            clientLogo: demoCtr.clientLogo,
            clientHue: demoCtr.clientHue,
            accountStatus: demoCtr.accountStatus,
            health: demoCtr.health,
          }}
          owner={
            owner
              ? {
                  name: owner.name,
                  role: owner.role,
                  avatar: owner.avatar,
                  hue: owner.hue,
                }
              : null
          }
          daysUntilRenewal={daysUntilRenewal}
          industry={client.industry}
          renewalReferenceIso={renewalRefDemo}
        />

        <ContractDetailTabbedBody
          contract={demoCtr}
          client={client}
          renewalReferenceIso={renewalRefDemo}
          referenceChipLabel="Reference"
          referenceChipValue={renewalRefDemo}
          retainerHistory={retainerHist}
        />
      </div>
    );
  }

  if (dataSource === "database" && remote && typeof remote === "object" && remote.contract && remote.client) {
    /** @type {any} */
    const ctr = remote.contract;
    /** @type {any} */
    const client = remote.client;
    const renewalRef = String(remote.renewalReferenceIso ?? CONTRACT_DEMO_REF_DATE);

    /** @type {any} */
    const owner =
      remote.owner && typeof remote.owner === "object" && "name" in remote.owner ? remote.owner : null;

    const daysUntilRenewal = contractDaysUntilRenewal(ctr.renewalAt, renewalRef);
    const actionId = ctr.mongoId || ctr.id;

    return (
      <div
        className={cn(
          "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
          loading && "opacity-65",
        )}
      >
        {error ?
          <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-4 py-2 font-sans text-[12px] text-agency-warn">
            {error} — viser senest indlæste data.
          </p>
        : null}

        <ContractDetailHeader
          contract={{
            id: ctr.id,
            kind: ctr.kind,
            clientName: ctr.clientName,
            clientLogo: ctr.clientLogo,
            clientHue: ctr.clientHue,
            accountStatus: ctr.accountStatus,
            health: ctr.health,
          }}
          owner={
            owner
              ? {
                  name: owner.name,
                  role: owner.role,
                  avatar: owner.avatar,
                  hue: owner.hue,
                }
              : null
          }
          daysUntilRenewal={daysUntilRenewal}
          industry={client.industry}
          renewalReferenceIso={renewalRef}
          trailing={
            <ContractDetailActions
              contractId={actionId}
              accountStatus={ctr.accountStatus}
              signingState={ctr.signingState}
              onDone={() => void loadRemote()}
            />
          }
        />

        <ContractDetailTabbedBody
          contract={ctr}
          client={client}
          renewalReferenceIso={renewalRef}
          referenceChipLabel={
            typeof remote.referenceChipLabel === "string" ? remote.referenceChipLabel : undefined
          }
          referenceChipValue={
            typeof remote.referenceChipValue === "string" ? remote.referenceChipValue : undefined
          }
          retainerHistory={Array.isArray(remote.retainerHistory) ? remote.retainerHistory : []}
        />
      </div>
    );
  }

  if (dataSource === "database" && error && !remote?.contract) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error}{" "}
          <Link href={routes.contracts} className="font-medium underline">
            Tilbage til Kontrakter
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "database") {
    return (
      <div className="space-y-3">
        <div className="h-8 animate-pulse rounded-lg bg-skeleton" />
        <div className="h-24 animate-pulse rounded-2xl bg-skeleton" />
        <div className="h-40 animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  return null;
}
