"use client";

import Link from "next/link";
import { useState } from "react";

import { routes } from "@/config/routes";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { formatCurrency, formatPercent } from "@/lib/crm/format-da";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @param {unknown} v */
function toNum(v) {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Aktive services og budget pr. service. Budgettet fordeles ud af den samlede MRR
 * (retainer + signerede kontrakter) fra "Økonomi & aftale".
 *
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number] & Record<string, any>;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailServiceMixCard({ client, canEdit = false, onSaved }) {
  const active = client.servicesActive ?? [];
  const alloc = client.allocation ?? {};
  const budgets = client.serviceBudgets ?? {};
  const currency = client.currency ?? "DKK";
  const mrr = client.retainer ?? 0;

  const [editing, setEditing] = useState(false);
  const [services, setServices] = useState(/** @type {string[]} */ ([]));
  const [amounts, setAmounts] = useState(/** @type {Record<string, string>} */ ({}));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [addKey, setAddKey] = useState("");

  const start = () => {
    setServices([...active]);
    setAmounts(Object.fromEntries(Object.entries(budgets).map(([k, v]) => [k, String(v)])));
    setAddKey("");
    setError(null);
    setEditing(true);
  };

  const shownActive = editing ? services : active;
  const allocated = editing ?
      services.reduce((s, k) => s + toNum(amounts[k]), 0)
    : Object.values(budgets).reduce((s, v) => s + Number(v || 0), 0);
  const remaining = mrr - allocated;
  const over = remaining < -0.5;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const serviceBudgets = Object.fromEntries(
        services.map((k) => [k, toNum(amounts[k])]).filter(([, v]) => Number(v) > 0),
      );
      const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}?${databaseApiQuery()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicesActive: services, serviceBudgets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      setEditing(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setSaving(false);
    }
  };

  const addable = DEPARTMENTS.filter((d) => !services.includes(d.id));

  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Aktive services & kapacitetsfordeling
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && !editing ?
            <button
              type="button"
              onClick={start}
              className="inline-flex h-8 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand"
            >
              Tilføj / redigér services
            </button>
          : null}
          <Link href={routes.tasks} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
            Opgaver — hel workspace →
          </Link>
        </div>
      </div>

      <p className="mt-2 max-w-xl font-sans text-[11px] leading-snug text-fg-muted">
        Budget pr. service udtages af den samlede MRR ({formatCurrency(mrr, currency)} / md). Timebudget:{" "}
        {client.hoursBudget} t/md.
      </p>

      <div
        className={cn(
          "mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-1.5 text-[12px] tabular-nums",
          over ? "bg-agency-bad-soft text-agency-bad" : "bg-surface-muted text-fg-muted",
        )}
      >
        <span>Fordelt: {formatCurrency(allocated, currency)}</span>
        <span>{over ? "Over MRR med" : "Ufordelt"}: {formatCurrency(Math.abs(remaining), currency)}</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
              <th className="py-2 pr-3 font-medium">Disciplin</th>
              <th className="py-2 pr-3 font-medium">Aktiv</th>
              <th className="py-2 pr-3 font-medium">Budget / md</th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell">Tid / md (~)</th>
              <th className="py-2 font-medium">Andel</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.filter((d) => !editing || services.includes(d.id) || active.includes(d.id)).map((d) => {
              const pct = alloc[d.id];
              const isActive = shownActive.includes(d.id);
              const budget = editing ? toNum(amounts[d.id]) : Number(budgets[d.id] ?? 0);
              const hoursApprox =
                pct != null && pct > 0 ? ((client.hoursBudget * pct) / 100).toFixed(1) : null;
              return (
                <tr
                  key={d.id}
                  className={cn(
                    "border-b border-border-soft last:border-0",
                    isActive ? "opacity-100" : "opacity-55",
                  )}
                >
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 font-sans text-[13px] text-fg">
                      <span
                        className="size-2.5 shrink-0 rounded-sm ring-1 ring-border/50"
                        style={{ backgroundColor: agencyDeptColor(d.id) }}
                      />
                      {d.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {editing ?
                      <button
                        type="button"
                        onClick={() => setServices((cur) => cur.filter((k) => k !== d.id))}
                        className="text-[11px] text-agency-bad hover:underline"
                      >
                        Fjern
                      </button>
                    : <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          isActive
                            ? "border-agency-ok-border bg-agency-ok-soft text-agency-ok"
                            : "border-border bg-surface-muted text-fg-quiet",
                        )}
                      >
                        {isActive ? "Ja" : "Nej"}
                      </span>
                    }
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-fg">
                    {editing && isActive ?
                      <input
                        inputMode="decimal"
                        value={amounts[d.id] ?? ""}
                        placeholder="0"
                        onChange={(e) => setAmounts((cur) => ({ ...cur, [d.id]: e.target.value }))}
                        className="h-8 w-28 rounded-md border border-border bg-surface-muted px-2 text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
                      />
                    : budget > 0 ?
                      formatCurrency(budget, currency)
                    : "—"}
                  </td>
                  <td className="hidden py-2.5 pr-3 tabular-nums text-fg-muted sm:table-cell">
                    {hoursApprox != null ? `${hoursApprox} t` : "—"}
                  </td>
                  <td className="py-2.5 tabular-nums text-fg">
                    {pct != null ? formatPercent((pct ?? 0) / 100) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ?
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface-muted px-3 text-[13px] text-fg"
            >
              <option value="">Tilføj service…</option>
              {addable.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!addKey}
              onClick={() => {
                setServices((cur) => [...cur, addKey]);
                setAddKey("");
              }}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-fg hover:bg-surface-muted disabled:opacity-50"
            >
              Tilføj
            </button>
          </div>
          {error ?
            <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 text-[12px] text-agency-bad">
              {error}
            </p>
          : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="button"
              disabled={saving || over}
              onClick={() => void save()}
              className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 text-[12px] font-semibold text-canvas disabled:opacity-50"
            >
              {saving ? "Gemmer…" : "Gem services"}
            </button>
          </div>
        </div>
      : null}
    </div>
  );
}
