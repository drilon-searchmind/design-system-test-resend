"use client";

import { ClientDetailShell } from "@/components/clients/client-detail-shell";
import { useDataSource } from "@/components/crm/use-data-source";

/**
 * @param {{ clientSlug: string; groupCvr?: string }} props
 */
export function ClientDetailPageClient({ clientSlug, groupCvr }) {
  const dataSource = useDataSource();
  return (
    <ClientDetailShell
      key={`${groupCvr ?? clientSlug}-${dataSource}`}
      clientSlug={clientSlug}
      groupCvr={groupCvr}
    />
  );
}
