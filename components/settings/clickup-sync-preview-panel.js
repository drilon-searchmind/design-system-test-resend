"use client";

import { Fragment, useCallback, useMemo, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { cn } from "@/lib/utils";

/** @typedef {'new' | 'update' | 'unchanged' | 'skipped'} SyncKind */

/** @type {Record<SyncKind, string>} */
const KIND_LABELS = {
  new: "Ny",
  update: "Opdatering",
  unchanged: "Uændret",
  skipped: "Sprunget over",
};

/** @type {Record<SyncKind, string>} */
const KIND_BADGE = {
  new: "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
  update: "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
  unchanged: "border-border bg-surface-muted text-fg-muted",
  skipped: "border-border bg-surface-muted text-fg-quiet",
};

/**
 * @param {{
 *   title: string;
 *   description: React.ReactNode;
 *   previewPath: string;
 *   applyPath: string;
 *   applyBodyKey: string;
 *   entityLabel: string;
 *   entityLabelPlural?: string;
 *   fieldLabels?: Record<string, string>;
 *   secondaryColumnLabel?: string;
 *   secondaryColumnValue?: (row: {
 *     id: string;
 *     kind: SyncKind;
 *     linkUrl: string;
 *     proposed: Record<string, string> | null;
 *     current: Record<string, string> | null;
 *     changes: Array<{ field: string; from: string; to: string }>;
 *   }) => string;
 *   rowLabel?: (row: {
 *     id: string;
 *     kind: SyncKind;
 *     linkUrl: string;
 *     proposed: Record<string, string> | null;
 *     current: Record<string, string> | null;
 *     changes: Array<{ field: string; from: string; to: string }>;
 *   }) => string;
 *   rowSubLabel?: (row: {
 *     id: string;
 *     kind: SyncKind;
 *     linkUrl: string;
 *     proposed: Record<string, string> | null;
 *     current: Record<string, string> | null;
 *     changes: Array<{ field: string; from: string; to: string }>;
 *   }) => string | null;
 *   confirmApply?: (count: number) => string;
 *   renderMeta?: (preview: Record<string, unknown>) => React.ReactNode;
 *   selectableKinds?: SyncKind[];
 *   previewOnly?: boolean;
 *   getPreviewRequestBody?: () => Record<string, unknown>;
 *   renderPreviewControls?: React.ReactNode;
 * }} props
 */
export function ClickUpSyncPreviewPanel({
  title,
  description,
  previewPath,
  applyPath,
  applyBodyKey,
  entityLabel,
  entityLabelPlural,
  fieldLabels = {},
  secondaryColumnLabel = "Status",
  secondaryColumnValue = (row) => row.proposed?.status || row.current?.status || "—",
  rowLabel = (row) => row.proposed?.name || row.current?.name || row.id || "—",
  rowSubLabel = (row) => row.proposed?.slug || row.current?.slug || null,
  confirmApply,
  renderMeta,
  selectableKinds = ["new", "update"],
  previewOnly = false,
  getPreviewRequestBody,
  renderPreviewControls,
}) {
  const effectiveSelectableKinds = previewOnly ? [] : selectableKinds;
  const plural = entityLabelPlural ?? `${entityLabel}r`;
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [preview, setPreview] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [filter, setFilter] = useState(/** @type {'all' | SyncKind} */ ("all"));
  const [selected, setSelected] = useState(/** @type {Set<string>} */ (new Set()));
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null));

  const rows = useMemo(() => {
    const raw = preview?.rows;
    return Array.isArray(raw) ? /** @type {Array<{
      id: string;
      kind: SyncKind;
      linkUrl: string;
      proposed: Record<string, string> | null;
      current: Record<string, string> | null;
      changes: Array<{ field: string; from: string; to: string }>;
    }>} */ (raw) : [];
  }, [preview?.rows]);

  const counts = useMemo(() => {
    const raw = preview?.counts;
    if (!raw || typeof raw !== "object") {
      return { new: 0, update: 0, unchanged: 0, skipped: 0 };
    }
    return /** @type {Record<SyncKind, number>} */ (raw);
  }, [preview?.counts]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const requestBody = getPreviewRequestBody?.();
      const res = await fetch(previewPath, {
        method: "POST",
        headers: requestBody ? { "Content-Type": "application/json" } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente preview");

      setPreview(data);
      const autoSelect = new Set(
        (Array.isArray(data.rows) ? data.rows : [])
          .filter((row) => effectiveSelectableKinds.includes(row.kind))
          .map((row) => row.id)
          .filter(Boolean),
      );
      setSelected(autoSelect);
      setFilter("all");
      setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [previewPath, effectiveSelectableKinds, getPreviewRequestBody]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.kind === filter);
  }, [filter, rows]);

  const selectableRows = useMemo(
    () => filteredRows.filter((row) => effectiveSelectableKinds.includes(row.kind)),
    [filteredRows, effectiveSelectableKinds],
  );

  const allSelectableChecked =
    selectableRows.length > 0 && selectableRows.every((row) => selected.has(row.id));

  function toggleRow(id) {
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectableChecked) {
        for (const row of selectableRows) next.delete(row.id);
      } else {
        for (const row of selectableRows) next.add(row.id);
      }
      return next;
    });
  }

  async function handleApply() {
    const ids = [...selected];
    if (!ids.length) return;

    const confirmText =
      confirmApply?.(ids.length) ??
      `Importer ${ids.length} ${ids.length === 1 ? entityLabel : plural}? Eksisterende rækker opdateres.`;

    if (!window.confirm(confirmText)) return;

    setApplying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(applyPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [applyBodyKey]: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import fejlede");

      setMessage(
        `Importeret ${data.imported ?? 0} ${data.imported === 1 ? entityLabel : plural}${
          data.skipped ? ` · ${data.skipped} sprunget over` : ""
        }.`,
      );
      await loadPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl ved import");
    } finally {
      setApplying(false);
    }
  }

  const fetchedAt =
    typeof preview?.fetchedAt === "string" ? new Date(preview.fetchedAt).toLocaleString("da-DK") : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-sans text-[15px] font-semibold text-fg">{title}</h3>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">{description}</p>
          {typeof preview?.slowFetchNote === "string" ?
            <p className="mt-2 rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-2 font-sans text-[11px] text-agency-warn">
              {preview.slowFetchNote}
            </p>
          : null}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {renderPreviewControls}
          <button
            type="button"
            disabled={loading || applying}
            onClick={() => void loadPreview()}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 font-sans text-[12px] font-semibold text-agency-brand transition-colors hover:bg-agency-brand-soft/80 disabled:opacity-50"
          >
            {loading ? "Henter…" : preview ? "Opdater preview" : "Hent preview"}
          </button>
        </div>
      </div>

      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}
      {message ?
        <p className="rounded-lg border border-agency-ok-border bg-agency-ok-soft px-3 py-2 font-sans text-[12px] text-agency-ok">
          {message}
        </p>
      : null}

      {preview ?
        <>
          <div className="flex flex-wrap gap-2">
            {(["new", "update", "unchanged", "skipped"]).map((kind) => (
              <span
                key={kind}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium",
                  KIND_BADGE[/** @type {SyncKind} */ (kind)],
                )}
              >
                {KIND_LABELS[/** @type {SyncKind} */ (kind)]}
                <span className="tabular-nums">{counts[/** @type {SyncKind} */ (kind)] ?? 0}</span>
              </span>
            ))}
            {fetchedAt ?
              <span className="self-center font-sans text-[11px] text-fg-quiet">{fetchedAt}</span>
            : null}
          </div>

          {renderMeta ? renderMeta(preview) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PulseSegmentedControl
              size="sm"
              active={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: "Alle", count: rows.length },
                { id: "new", label: "Nye", count: counts.new },
                { id: "update", label: "Opdateringer", count: counts.update },
                { id: "unchanged", label: "Uændrede", count: counts.unchanged },
              ]}
            />
            {!previewOnly ?
              <button
                type="button"
                disabled={!selected.size || applying}
                onClick={() => void handleApply()}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-canvas px-4 font-sans text-[12px] font-semibold text-fg transition-colors hover:border-agency-brand-border hover:text-agency-brand disabled:opacity-50"
              >
                {applying ? "Importerer…" : `Importer valgte (${selected.size})`}
              </button>
            : null}
          </div>

          <div className="tally-panel overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse font-sans text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-canvas">
                  <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-fg-soft">
                    {!previewOnly ?
                      <th className="w-10 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={allSelectableChecked}
                          disabled={!selectableRows.length}
                          onChange={toggleAllVisible}
                          aria-label="Vælg alle synlige rækker"
                          className="size-3.5 accent-agency-brand"
                        />
                      </th>
                    : null}
                    <th className="px-2 py-2">Navn</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">{secondaryColumnLabel}</th>
                    <th className="px-2 py-2">Ændringer</th>
                    <th className="px-2 py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ?
                    <tr>
                      <td colSpan={previewOnly ? 5 : 6} className="px-3 py-8 text-center text-fg-muted">
                        Ingen rækker i dette filter.
                      </td>
                    </tr>
                  : filteredRows.map((row) => {
                      const selectable = effectiveSelectableKinds.includes(row.kind);
                      const isExpanded = expandedId === row.id;
                      const sub = rowSubLabel(row);
                      const rowKey = row.id || row.linkUrl;
                      const previewFields =
                        previewOnly && row.proposed ?
                          Object.entries(row.proposed).filter(([, value]) => String(value ?? "").trim())
                        : [];
                      return (
                        <Fragment key={rowKey}>
                          <tr className="border-b border-border/70 hover:bg-surface-muted/40">
                            {!previewOnly ?
                              <td className="px-2 py-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={selected.has(row.id)}
                                  disabled={!selectable}
                                  onChange={() => toggleRow(row.id)}
                                  aria-label={`Vælg ${rowLabel(row)}`}
                                  className="size-3.5 accent-agency-brand disabled:opacity-30"
                                />
                              </td>
                            : null}
                            <td className="px-2 py-2 align-top">
                              <div className="font-medium text-fg">{rowLabel(row)}</div>
                              {sub ?
                                <div className="mt-0.5 font-mono text-[10px] text-fg-quiet">{sub}</div>
                              : null}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  KIND_BADGE[row.kind],
                                )}
                              >
                                {KIND_LABELS[row.kind]}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-top text-fg-muted">{secondaryColumnValue(row)}</td>
                            <td className="px-2 py-2 align-top">
                              {row.changes.length ?
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                  className="text-left text-agency-brand hover:underline"
                                >
                                  {row.changes.length} felt{row.changes.length === 1 ? "" : "er"}
                                </button>
                              : previewFields.length ?
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                  className="text-left text-agency-brand hover:underline"
                                >
                                  Detaljer
                                </button>
                              : row.kind === "new" ?
                                <span className="text-fg-quiet">Ny række</span>
                              : <span className="text-fg-quiet">—</span>}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {row.linkUrl ?
                                <a
                                  href={row.linkUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-agency-brand hover:underline"
                                >
                                  Åbn
                                </a>
                              : "—"}
                            </td>
                          </tr>
                          {isExpanded && (row.changes.length || previewFields.length) ?
                            <tr className="border-b border-border/70 bg-surface-muted/30">
                              <td colSpan={previewOnly ? 5 : 6} className="px-3 py-3">
                                <ul className="grid gap-1.5 sm:grid-cols-2">
                                  {(row.changes.length ? row.changes.map((change) => ({
                                    key: change.field,
                                    label: fieldLabels[change.field] ?? change.field,
                                    value: change.to || "—",
                                  })) : previewFields.map(([field, value]) => ({
                                    key: field,
                                    label: fieldLabels[field] ?? field,
                                    value: String(value),
                                  }))).map((item) => (
                                    <li
                                      key={`${row.id}-${item.key}`}
                                      className="rounded-md border border-border bg-canvas px-2 py-1.5"
                                    >
                                      <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                                        {item.label}
                                      </div>
                                      <div className="mt-0.5 font-medium text-fg">{item.value || "—"}</div>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          : null}
                        </Fragment>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      : null}
    </div>
  );
}
