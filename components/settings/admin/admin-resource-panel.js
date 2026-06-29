"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CrmDialog } from "@/components/crm/crm-dialog";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { ADMIN_RESOURCE_META } from "@/lib/crm/admin-resource-meta";
import { AdminColorTokenCell } from "./admin-color-token-cell";
import { AdminFormFields } from "./admin-form-fields";
import { emptyFormValues, formatCellValue, itemToFormValues } from "./admin-form-utils";

/**
 * @param {{ resourceId: string }} props
 */
export function AdminResourcePanel({ resourceId }) {
  const meta = ADMIN_RESOURCE_META[resourceId];
  const [items, setItems] = useState(/** @type {Record<string, unknown>[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null));
  const [values, setValues] = useState(() => emptyFormValues(meta?.fields ?? []));
  const [saving, setSaving] = useState(false);
  const [relationOptions, setRelationOptions] = useState(
    /** @type {Record<string, { _id: string; label: string }[]>} */ ({}),
  );
  const [testFilter, setTestFilter] = useState(/** @type {'all' | 'production' | 'test'} */ ("all"));

  const relationResourceIds = useMemo(() => {
    const set = new Set();
    for (const f of meta?.fields ?? []) {
      if ((f.type === "relation" || f.type === "multiRelation") && f.relation) {
        set.add(f.relation);
      }
    }
    return [...set];
  }, [meta]);

  const fieldByName = useMemo(() => {
    const map = /** @type {Record<string, import('@/lib/crm/admin-resource-meta').AdminFieldDef>} */ ({});
    for (const f of meta?.fields ?? []) map[f.name] = f;
    return map;
  }, [meta]);

  const relationLabelMaps = useMemo(() => {
    /** @type {Record<string, Record<string, { _id: string; label: string }>>} */
    const out = {};
    for (const relId of relationResourceIds) {
      const list = relationOptions[relId] ?? [];
      out[relId] = Object.fromEntries(list.map((o) => [o._id, o]));
    }
    return out;
  }, [relationOptions, relationResourceIds]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ testFilter });
      const res = await fetch(`/api/crm/${resourceId}?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente data");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resourceId, testFilter]);

  const loadRelations = useCallback(async () => {
    const entries = await Promise.all(
      relationResourceIds.map(async (relId) => {
        try {
          const res = await fetch(`/api/crm/${relId}?testFilter=all`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) return [relId, []];
          const relMeta = ADMIN_RESOURCE_META[relId];
          const labelKey =
            relMeta.fields.find((f) => f.name === "name" || f.name === "title" || f.name === "slug")?.name ??
            "name";
          const opts = (data.items ?? []).map((/** @type {Record<string, unknown>} */ row) => ({
            _id: String(row._id),
            label: String(row[labelKey] ?? row.slug ?? row.key ?? row._id).slice(0, 80),
          }));
          return [relId, opts];
        } catch {
          return [relId, []];
        }
      }),
    );
    setRelationOptions(Object.fromEntries(entries));
  }, [relationResourceIds]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadItems();
      void loadRelations();
    });
  }, [loadItems, loadRelations]);

  function openCreate() {
    setEditingId(null);
    setValues(emptyFormValues(meta.fields));
    setFormOpen(true);
    setError(null);
  }

  function openEdit(item) {
    setEditingId(String(item._id));
    setValues(itemToFormValues(item, meta.fields));
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/crm/${resourceId}/${editingId}` : `/api/crm/${resourceId}`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      closeForm();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gemme");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const id = String(item._id);
    const label =
      String(item.name ?? item.title ?? item.slug ?? item.key ?? item.label ?? id).slice(0, 60) || id;
    if (!window.confirm(`Slet ${meta.labelSingular} «${label}»? Dette kan ikke fortrydes.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/crm/${resourceId}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      if (editingId === id) closeForm();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke slette");
    }
  }

  if (!meta) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-sans text-base font-semibold text-fg">{meta.label}</h2>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">{meta.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PulseSegmentedControl
            size="sm"
            active={testFilter}
            onChange={(id) => setTestFilter(/** @type {'all' | 'production' | 'test'} */ (id))}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "production", label: "Skjul test" },
              { id: "test", label: "Kun test" },
            ]}
          />
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-4 font-sans text-[12px] font-semibold text-white hover:bg-agency-brand/90"
          >
            Opret {meta.labelSingular}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      ) : null}

      <section className="tally-panel overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center font-sans text-[13px] text-fg-muted">Henter…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center font-sans text-[13px] text-fg-muted">
            Ingen poster endnu — opret den første {meta.labelSingular}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  {meta.listColumns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-fg-soft"
                    >
                      {fieldByName[col]?.label ?? col}
                    </th>
                  ))}
                  <th className="w-[120px] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                    Handling
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={String(item._id)}
                    className={
                      item.isTest
                        ? "border-b border-border-soft bg-agency-brand-soft/20 last:border-0"
                        : "border-b border-border-soft last:border-0"
                    }
                  >
                    {meta.listColumns.map((col) => {
                      const field = fieldByName[col] ?? { name: col, type: "text", label: col };
                      return (
                        <td key={col} className="max-w-[240px] px-3 py-2.5 font-sans text-[13px] text-fg">
                          {field.type === "colorToken" ? (
                            <AdminColorTokenCell token={item[col]} />
                          ) : (
                            <span className="block max-w-[200px] truncate">
                              {formatCellValue(item[col], field, relationLabelMaps)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-md border border-border px-2 py-1 font-sans text-[11px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                        >
                          Rediger
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="rounded-md border border-agency-bad-border/60 px-2 py-1 font-sans text-[11px] font-medium text-agency-bad hover:bg-agency-bad-soft"
                        >
                          Slet
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CrmDialog
        open={formOpen}
        onClose={closeForm}
        ariaLabel={editingId ? `Rediger ${meta.labelSingular}` : `Opret ${meta.labelSingular}`}
      >
          <form onSubmit={(e) => void handleSubmit(e)} className="flex max-h-[min(92vh,920px)] flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
              <h3 className="font-sans text-[15px] font-semibold text-fg">
                {editingId ? "Rediger" : "Opret"} {meta.labelSingular}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-2 py-1 font-sans text-[12px] text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                Luk
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            <AdminFormFields
              fields={meta.fields}
              values={values}
              formResetKey={editingId ?? "new"}
              relationOptions={relationOptions}
              onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
            />
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3 md:px-6">
              <button
                type="button"
                onClick={closeForm}
                className="h-9 rounded-lg border border-border px-4 font-sans text-[12px] font-medium text-fg-muted hover:bg-surface-muted"
              >
                Annuller
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-lg border border-agency-brand-border bg-agency-brand px-4 font-sans text-[12px] font-semibold text-white hover:bg-agency-brand/90 disabled:opacity-50"
              >
                {saving ? "Gemmer…" : "Gem"}
              </button>
            </div>
          </form>
      </CrmDialog>
    </div>
  );
}
