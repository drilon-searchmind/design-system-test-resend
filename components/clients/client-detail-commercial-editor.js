"use client";

import { useState } from "react";

import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatCurrency, formatIsoDateDa } from "@/lib/crm/format-da";

const FIELD_LABELS = {
  retainerAmount: "MRR retainer",
  oneOffWebAmount: "Engangssalg (web)",
  serviceAgreementAnnual: "Serviceaftale (år)",
};

/** @param {unknown} v */
function toNum(v) {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Overblik + redigering af aftalebeløb: MRR retainer, engangssalg (web) og årlig serviceaftale.
 * Ændringer (fx opsalg) logges med note.
 *
 * @param {{
 *   client: Record<string, any>;
 *   commercialLog?: Array<{ at: string; by: string; note: string; changes: Record<string, { from: number | null; to: number | null }> }>;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailCommercialEditor({ client, commercialLog = [], canEdit = false, onSaved }) {
  const currency = client.currency ?? "DKK";
  const baseRetainer = client.retainerBase ?? client.retainer ?? 0;
  const contractRetainer = client.retainerFromContracts ?? 0;
  const oneOff = client.oneOffWebAmount ?? 0;
  const serviceYear = client.serviceAgreementAnnual ?? 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ retainer: "", web: "", service: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const start = () => {
    setDraft({
      retainer: String(baseRetainer || ""),
      web: String(oneOff || ""),
      service: String(serviceYear || ""),
      note: "",
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}?${databaseApiQuery()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retainerAmount: toNum(draft.retainer),
          oneOffWebAmount: toNum(draft.web),
          serviceAgreementAnnual: toNum(draft.service),
          commercialNote: draft.note,
        }),
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

  const inputCls =
    "h-9 w-full rounded-lg border border-border bg-surface-muted px-3 text-[13px] tabular-nums text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Aftalebeløb</h2>
        {canEdit && !editing ?
          <button
            type="button"
            onClick={start}
            className="inline-flex h-8 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand"
          >
            Ændr beløb / opsalg
          </button>
        : null}
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[11px] text-fg-soft">MRR retainer (fast)</dt>
          <dd className="mt-1 text-lg tabular-nums text-fg">{formatCurrency(baseRetainer, currency)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-fg-soft">+ Fra signerede kontrakter</dt>
          <dd className="mt-1 text-lg tabular-nums text-fg">{formatCurrency(contractRetainer, currency)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-fg-soft">Engangssalg (web)</dt>
          <dd className="mt-1 text-lg tabular-nums text-fg">{formatCurrency(oneOff, currency)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-fg-soft">Serviceaftale (årlig)</dt>
          <dd className="mt-1 text-lg tabular-nums text-fg">{formatCurrency(serviceYear, currency)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-fg-quiet">
        Samlet MRR: <span className="tabular-nums text-fg-muted">{formatCurrency(client.retainer ?? 0, currency)}</span>
        {" · "}
        Nyt opsalg på en eksisterende kunde? Opret helst en ny kontrakt — den lægges automatisk til MRR.
      </p>

      {editing ?
        <div className="mt-4 rounded-xl border border-border-soft bg-surface-muted/35 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              MRR retainer (fast, {currency}/md)
              <input
                className={inputCls}
                inputMode="decimal"
                value={draft.retainer}
                onChange={(e) => setDraft((d) => ({ ...d, retainer: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Engangssalg web ({currency})
              <input
                className={inputCls}
                inputMode="decimal"
                value={draft.web}
                onChange={(e) => setDraft((d) => ({ ...d, web: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Serviceaftale ({currency}/år)
              <input
                className={inputCls}
                inputMode="decimal"
                value={draft.service}
                onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value }))}
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[11px] text-fg-soft">
            Note (fx &quot;Opsalg: SEO-pakke&quot;)
            <input
              className={inputCls}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </label>
          {error ?
            <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 text-[12px] text-agency-bad">
              {error}
            </p>
          : null}
          <div className="mt-3 flex gap-2">
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
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 text-[12px] font-semibold text-canvas disabled:opacity-50"
            >
              {saving ? "Gemmer…" : "Gem ændringer"}
            </button>
          </div>
        </div>
      : null}

      {commercialLog.length > 0 ?
        <div className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Ændringshistorik</h3>
          <ul className="mt-2 space-y-1.5 text-[12px] text-fg-muted">
            {commercialLog.slice(0, 8).map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="tabular-nums text-fg-quiet">{formatIsoDateDa(e.at)}</span>
                {e.by ? ` · ${e.by}` : ""}
                {": "}
                {Object.entries(e.changes)
                  .map(
                    ([k, v]) =>
                      `${FIELD_LABELS[/** @type {keyof typeof FIELD_LABELS} */ (k)] ?? k} ${formatCurrency(v.from ?? 0, currency)} → ${formatCurrency(v.to ?? 0, currency)}`,
                  )
                  .join(", ")}
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      : null}
    </div>
  );
}
