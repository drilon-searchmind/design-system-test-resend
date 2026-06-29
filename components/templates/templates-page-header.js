"use client";

import { PulseIconSparkle } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   summary: {
 *     total: number;
 *     activeCount: number;
 *     deptCoverageNum: number;
 *     deptCoverageDen: number;
 *     totalUsage: number;
 *   } | null;
 *   loading?: boolean;
 *   refreshing?: boolean;
 *   onOpenCreate?: () => void;
 *   createModalOpen?: boolean;
 *   dataSource: "demo" | "database";
 * }} props
 */
export function TemplatesPageHeader({
  summary,
  loading = false,
  refreshing = false,
  onOpenCreate,
  createModalOpen = false,
  dataSource,
}) {
  /** @type {string} */
  let bodyLine = "";

  if (loading && summary == null) {
    bodyLine = "Indlæser bibliotek…";
  } else if (summary != null) {
    bodyLine = `${summary.total} skabeloner · ${summary.activeCount} aktive · ${summary.deptCoverageNum}/${summary.deptCoverageDen} discipliner · Σ ${summary.totalUsage} provisions-koblinger (opgaver)`;
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          <PulseIconSparkle size={13} className="text-agency-brand" aria-hidden /> Bibliotek
        </p>
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">
          Task templates
        </h1>
        <p
          className={cn(
            "mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted transition-opacity",
            refreshing && "opacity-60",
          )}
        >
          {bodyLine}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onOpenCreate && dataSource === "database" ?
          <button
            type="button"
            onClick={onOpenCreate}
            aria-haspopup="dialog"
            aria-expanded={createModalOpen}
            className={cn(
              "inline-flex h-[34px] items-center gap-1.5 rounded-md border px-4 font-sans text-[13px] font-medium",
              createModalOpen ?
                "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-agency-brand-border bg-agency-brand-soft text-agency-brand hover:bg-agency-brand/15",
            )}
          >
            <PulseIconSparkle size={14} /> Ny skabelon
          </button>
        : null}
      </div>
    </header>
  );
}
