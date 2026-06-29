"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import {
  TEMPLATE_DETAIL_TAB_IDS,
  TemplateDetailTabbedBody,
} from "@/components/templates/template-detail-tabbed-body";
import { TemplateDetailHeader } from "@/components/templates/template-detail-header";
import { routes } from "@/config/routes";
import { getTaskTemplatesDemoBundle } from "@/lib/crm/templates-demo-bundle";
import { cn } from "@/lib/utils";

/** @typedef {{ id: string; name?: string; short?: string; color?: string }} DeptLite */

/**
 * @param {{ deptKey: string; departments: DeptLite[] }} opts
 */
function resolveDeptLabel({ deptKey, departments }) {
  const k = String(deptKey || "").trim();
  if (!k || k === "—") return "—";
  const d = departments.find((row) => row.id === k);
  if (typeof d?.name === "string" && d.name.trim()) return d.name.trim();
  if (typeof d?.short === "string" && d.short.trim()) return d.short.trim();
  return k;
}

/**
 * @param {{
 *   wire: Record<string, unknown>;
 *   departments: DeptLite[];
 * }} opts
 */
function buildTemplateHeaderRow({ wire, departments }) {
  const dk = typeof wire.dept === "string" ? wire.dept : "—";

  /** @type {string} */
  const scopeStr = typeof wire.scope === "string" ? wire.scope : "retainer";
  /** @type {boolean} */
  const activeBool = wire.active !== false;
  /** @type {number} */
  const usedNum = typeof wire.usedCount === "number" && Number.isFinite(wire.usedCount) ? wire.usedCount : 0;
  /** @type {number} */
  const chkNum =
    typeof wire.checklistCount === "number" && Number.isFinite(wire.checklistCount) ?
      Math.max(0, wire.checklistCount)
    : 0;
  /** @type {number} */
  const dod =
    typeof wire.defaultDueOffsetDays === "number" && Number.isFinite(wire.defaultDueOffsetDays)
      ? wire.defaultDueOffsetDays
      : 0;
  /** @type {number} */
  const est =
    typeof wire.estHours === "number" && Number.isFinite(wire.estHours) ? wire.estHours : 0;
  /** @type {string} */
  const up = typeof wire.updatedAt === "string" ? wire.updatedAt : "";

  return {
    id: typeof wire.id === "string" ? wire.id : "—",
    name: typeof wire.name === "string" ? wire.name : "—",
    hint: typeof wire.hint === "string" ? wire.hint : "",
    dept: dk,
    deptLabel: resolveDeptLabel({ deptKey: dk, departments }),
    scope: scopeStr,
    active: activeBool,
    defaultPriority: typeof wire.defaultPriority === "string" ? wire.defaultPriority : "medium",
    checklistCount: chkNum,
    defaultDueOffsetDays: dod,
    estHours: est,
    usedCount: usedNum,
    updatedAt: up,
  };
}

/**
 * @param {{ templateId: string }} props
 */
export function TemplateDetailShell({ templateId }) {
  const dataSource = useDataSource();
  const [detailTab, setDetailTab] = useState(TEMPLATE_DETAIL_TAB_IDS[0]);
  const [remote, setRemote] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [mongoBusy, setMongoBusy] = useState(false);
  const [mongoNotice, setMongoNotice] = useState(/** @type {string | null} */ (null));

  const demoBundle = useMemo(() => getTaskTemplatesDemoBundle(), []);
  /** @type {Record<string, unknown> | undefined} */
  const demoWire = useMemo(
    () =>
      /** @type {Record<string, unknown> | undefined} */ (
        demoBundle.templates.find((t) => t.id === templateId) ?? undefined
      ),
    [demoBundle.templates, templateId],
  );

  /** @type {DeptLite[]} */
  const demoDeptRows = useMemo(
    () =>
      demoBundle.departments.map((d) => ({
        id: typeof d.id === "string" ? d.id : String(d?.id ?? ""),
        name: typeof d.name === "string" ? d.name : "",
        short: typeof d.short === "string" ? d.short : undefined,
        color: typeof d.color === "string" ? d.color : undefined,
      })),
    [demoBundle.departments],
  );

  const loadRemote = useCallback(async () => {
    setMongoNotice(null);
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ includeTest: "1" });
      const res = await fetch(`/api/task-templates/${encodeURIComponent(templateId)}?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente skabelonen");
      setRemote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (dataSource !== "database") return;
    queueMicrotask(() => {
      void loadRemote();
    });
  }, [dataSource, loadRemote]);

  /** @type {DeptLite[]} */
  const mongoDeptRows = useMemo(() => {
    const raw = remote != null && Array.isArray(remote.departments) ? remote.departments : [];
    /** @type {DeptLite[]} */
    const rows = [];
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const id = typeof item.id === "string" ? item.id : "";
      if (!id.trim()) continue;
      rows.push({
        id,
        name: typeof item.name === "string" ? item.name : id,
        short: typeof item.short === "string" ? item.short : undefined,
        color: typeof item.color === "string" ? item.color : undefined,
      });
    }
    return rows;
  }, [remote]);

  if (dataSource === "demo" && !demoWire) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-fg-muted">
          Ingen skabelon med nøgle <span className="text-fg">{templateId}</span>.{" "}
          <Link href={routes.templates} className="text-agency-brand hover:underline">
            Tilbage til Task templates
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "demo" && demoWire) {
    /** @type {typeof demoWire & Record<string, unknown>} */
    const w = demoWire;

    /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */
    const activityEntries = [];
    const uAt = typeof w.updatedAt === "string" ? w.updatedAt : "";
    if (uAt) {
      activityEntries.push({
        id: `${String(w.id)}-statisk`,
        at: uAt,
        kind: "Bibliotek",
        summary: "Registreret i skabelonbiblioteket.",
      });
    }

    const headerRow = buildTemplateHeaderRow({ wire: w, departments: demoDeptRows });

    return (
      <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
        <TemplateDetailHeader templateRow={headerRow} />

        <TemplateDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          templateWire={w}
          activityEntries={activityEntries}
          checklistDemoNote
          activityFootnote={undefined}
          mongo={null}
        />
      </div>
    );
  }

  /** @type {Record<string, unknown> | null} */
  const rTpl =
    remote && typeof remote.template === "object" && remote.template !== null ?
      /** @type {Record<string, unknown>} */ (remote.template)
    : null;

  /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */
  const dbActivity =
    remote && Array.isArray(remote.activityEntries) ?
      /** @type {Array<{ id: string; at: string; kind: string; summary: string }>} */ (remote.activityEntries)
    : [];

  if (dataSource === "database" && rTpl) {
    const headerRow = buildTemplateHeaderRow({ wire: rTpl, departments: mongoDeptRows });

    return (
      <div
        className={cn(
          "flex flex-col gap-[length:var(--ds-studio-stack)] transition-opacity",
          loading && "opacity-65",
        )}
      >
        {error ?
          <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-4 py-2 font-sans text-[12px] text-agency-warn">
            {error} — viser seneste indlæste data.
          </p>
        : null}

        <TemplateDetailHeader templateRow={headerRow} />

        <TemplateDetailTabbedBody
          tab={detailTab}
          onTabChange={setDetailTab}
          templateWire={rTpl}
          activityEntries={dbActivity}
          checklistDemoNote={false}
          activityFootnote={undefined}
          mongo={{
            templateRouteId: templateId,
            departments: mongoDeptRows,
            busy: mongoBusy,
            notice: mongoNotice,
            onBusyChange: setMongoBusy,
            onNotice: setMongoNotice,
            onReload: loadRemote,
          }}
        />
      </div>
    );
  }

  if (dataSource === "database" && error && !rTpl) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
          {error}{" "}
          <Link href={routes.templates} className="font-medium underline">
            Tilbage til Task templates
          </Link>
        </p>
      </div>
    );
  }

  if (dataSource === "database") {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded bg-skeleton" />
        <div className="h-24 animate-pulse rounded-2xl bg-skeleton" />
        <div className="h-48 animate-pulse rounded-2xl bg-skeleton" />
      </div>
    );
  }

  return null;
}
