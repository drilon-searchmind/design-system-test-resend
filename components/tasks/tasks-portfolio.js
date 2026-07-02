"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CrmDialog } from "@/components/crm/crm-dialog";
import { TasksCreateForm } from "@/components/tasks/tasks-create-form";
import { TasksDirectory } from "@/components/tasks/tasks-directory";
import { TasksPageHeader } from "@/components/tasks/tasks-page-header";
import { TasksSummaryStrip } from "@/components/tasks/tasks-summary-strip";
import { useDataSource } from "@/components/crm/use-data-source";
import { getTasksDemoBundle } from "@/lib/crm/tasks-demo-bundle";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { getCurrentReportPeriod, normalizeReportPeriod } from "@/lib/crm/report-period";
import { cn } from "@/lib/utils";

/** @typedef {ReturnType<typeof getTasksDemoBundle>} TasksPortfolioBundle */

export function TasksPortfolio() {
  const dataSource = useDataSource();
  const router = useRouter();
  const [period, setPeriod] = useState(() => getCurrentReportPeriod());
  const [bundle, setBundle] = useState(/** @type {TasksPortfolioBundle | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [showCreate, setShowCreate] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const openCreateModal = useCallback(() => {
    setCreateFormKey((n) => n + 1);
    setShowCreate(true);
    setCreateError(null);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    setCreateError(null);
  }, []);

  const handlePeriodChange = useCallback((next) => {
    setPeriod(normalizeReportPeriod(next));
  }, []);

  const load = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const p = normalizeReportPeriod(period);
      if (dataSource === "demo") {
        setBundle(getTasksDemoBundle(p));
        hasLoadedRef.current = true;
      } else {
        const qs = databaseApiQuery({ year: String(p.year),
          month: String(p.month),
        });
        const res = await fetch(`/api/tasks?${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente opgaver");
        setBundle(data);
        hasLoadedRef.current = true;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      if (isInitial) setBundle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataSource, period]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const mineLabel =
    bundle && bundle.tasks && bundle.team ?
      bundle.team.find((m) => m.id === bundle.mineAssigneeKey)?.name ??
      (bundle.mineAssigneeKey ? bundle.mineAssigneeKey : "")
    : "";

  const handleCreateSubmit = useCallback(
    async (body) => {
      if (dataSource !== "database") return;
      setCreateSubmitting(true);
      setCreateError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/tasks?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette");
        closeCreateModal();
        await load();
        window.dispatchEvent(new Event("crm-notifications-changed"));
        if (typeof data?.wire?.id === "string" && data.wire.id) {
          router.push(`/tasks/${encodeURIComponent(data.wire.id)}`);
        }
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Fejl");
      } finally {
        setCreateSubmitting(false);
      }
    },
    [closeCreateModal, dataSource, load, router],
  );

  if (loading && !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TasksPageHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          loading
          summary={null}
          mineLabel={null}
          onOpenCreate={undefined}
          createModalOpen={false}
          dataSource={dataSource}
        />
        <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-skeleton md:h-[100px]" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TasksPageHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          summary={null}
          mineLabel={null}
          dataSource={dataSource}
        />
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error ?? "Ingen data"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <TasksPageHeader
        period={period}
        onPeriodChange={handlePeriodChange}
        refreshing={refreshing}
        summary={bundle.summary}
        mineLabel={mineLabel || bundle.mineAssigneeKey || null}
        onOpenCreate={dataSource === "database" ? openCreateModal : undefined}
        createModalOpen={showCreate}
        dataSource={dataSource}
        taskDueReferenceIso={bundle.taskDueReferenceIso}
        periodLabel={bundle.period.label}
      />

      <CrmDialog
        open={showCreate && dataSource === "database"}
        onClose={closeCreateModal}
        ariaLabel="Ny opgave"
        maxWidthClass="w-[min(100vw-1.5rem,560px)]"
      >
        <div className="flex max-h-[min(92vh,920px)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                Ny registrering
              </p>
              <h2 className="font-sans text-[17px] font-semibold leading-snug text-fg md:text-[18px]">Ny opgave</h2>
            </div>
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={createSubmitting}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-lg leading-none text-fg-muted hover:border-agency-brand-border hover:text-fg disabled:opacity-40"
              aria-label="Luk"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4 md:px-6 md:pb-8">
            <TasksCreateForm
              key={createFormKey}
              departments={bundle.departments}
              team={bundle.team}
              clientsPicklist={bundle.clientsPicklist}
              taskTemplatesForCreate={bundle.taskTemplatesForCreate ?? []}
              submitting={createSubmitting}
              error={createError}
              onSubmit={handleCreateSubmit}
              onCancel={closeCreateModal}
              variant="modal"
            />
          </div>
        </div>
      </CrmDialog>

      <div className={cn("flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity", refreshing && "opacity-65")}>
        <TasksSummaryStrip summary={bundle.summary} />

        <TasksDirectory
          tasks={bundle.tasks}
          departments={bundle.departments}
          team={bundle.team}
          taskDueReferenceIso={bundle.taskDueReferenceIso}
          mineAssigneeKey={bundle.mineAssigneeKey}
        />

      </div>
    </div>
  );
}
