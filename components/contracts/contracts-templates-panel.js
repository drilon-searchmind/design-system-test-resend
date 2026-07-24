"use client";

import { useCallback, useEffect, useState } from "react";

import { ContractsTemplatesDirectory } from "@/components/contracts/contracts-templates-directory";
import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";

/**
 * Loads contract templates and renders the full editor (database mode only).
 */
export function ContractsTemplatesPanel() {
  const dataSource = useDataSource();
  const [templates, setTemplates] = useState(
    /** @type {Array<{ id: string; key: string; name: string; subject: string; emailBodyMd: string; documentBodyMd: string; defaultType: string; defaultNoticeDays: number; active: boolean; isDefault: boolean; updatedAt?: string }>} */ ([]),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async () => {
    if (dataSource === "demo") {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/contract-templates?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Fejl");
      setTemplates(
        (Array.isArray(data.templates) ? data.templates : []).map((t) => ({
          id: String(t.id),
          key: String(t.key),
          name: String(t.name),
          subject: String(t.subject ?? ""),
          emailBodyMd: String(t.emailBodyMd ?? ""),
          documentBodyMd: String(t.documentBodyMd ?? ""),
          defaultType: String(t.defaultType ?? "retainer"),
          defaultNoticeDays:
            typeof t.defaultNoticeDays === "number" ? t.defaultNoticeDays : 90,
          active: t.active !== false,
          isDefault: Boolean(t.isDefault),
          updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : undefined,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (error) {
    return (
      <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        {error}
      </p>
    );
  }

  return (
    <ContractsTemplatesDirectory
      templates={templates}
      loading={loading}
      canEdit={dataSource !== "demo"}
      onMutate={load}
    />
  );
}
