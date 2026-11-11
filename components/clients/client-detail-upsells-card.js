"use client";

import { useState } from "react";

import { DEPARTMENTS } from "@/lib/crm/static-data";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatCurrency, formatIsoDateDa } from "@/lib/crm/format-da";
import {
  UPSELL_DESCRIPTION_MAX_WORDS,
  UPSELL_TYPES,
  countWords,
  formatUpsellPeriodDa,
} from "@/lib/crm/upsell-utils";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-surface-muted px-3 text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

/** @param {string} id */
function deptName(id) {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth() {
  return todayIso().slice(0, 7);
}

/**
 * Opsalg på kunden: historik + oprettelse. Opsalg lægges oven i MRR (tillæg/engangs) — undtagen
 * "Fast MRR-stigning", som lægges direkte på MRR og logges.
 *
 * @param {{
 *   client: Record<string, any>;
 *   team?: Array<{ id: string; name: string }>;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailUpsellsCard({ client, team = [], canEdit = false, onSaved }) {
  const upsells = /** @type {import("@/lib/crm/upsell-utils").UpsellItem[]} */ (client.upsells ?? []);
  const currency = client.currency ?? "DKK";
  const activeIds = new Set((client.upsellMonth?.items ?? []).map((u) => u.id));

  const blank = () => ({
    type: "one_time",
    amount: "",
    department: "",
    periodFrom: currentMonth(),
    periodTo: "",
    soldByKey: "",
    soldBy: "",
    soldAt: todayIso(),
    description: "",
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const words = countWords(draft.description);

  /** @param {string} key */
  const pickSeller = (key) => {
    const m = team.find((t) => t.id === key);
    setDraft((d) => ({ ...d, soldByKey: key, soldBy: m?.name ?? "" }));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(client.id)}/upsells?${databaseApiQuery()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, amount: Number(String(draft.amount).replace(/\./g, "").replace(",", ".")) }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      setOpen(false);
      setDraft(blank());
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  };

  /** @param {string} id */
  const remove = async (id) => {
    if (!window.confirm("Slet dette opsalg? (En fast MRR-stigning rulles ikke tilbage på MRR.)")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(client.id)}/upsells/${encodeURIComponent(id)}?${databaseApiQuery()}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke slette");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tally-panel p-4 md:p-[var(--ds-studio-pad-main)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Opsalg</h2>
          <p className="mt-1 max-w-prose text-[11px] leading-snug text-fg-quiet">
            Opsalg lægges oven i MRR og vises som (+beløb (i)) hvor kunden vises. Engangs og tillæg
            gælder kun i deres måned(er). En fast MRR-stigning lægges direkte på MRR.
          </p>
        </div>
        {canEdit && !open ?
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand"
          >
            Tilføj opsalg
          </button>
        : null}
      </div>

      {!canEdit ?
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-fg-quiet">
          Opsalg kan kun oprettes når datakilden er sat til database (eksempeldata er skrivebeskyttet).
        </p>
      : null}

      {open ?
        <div className="mt-4 rounded-xl border border-border-soft bg-surface-muted/35 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Type
              <select
                className={inputCls}
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              >
                {Object.entries(UPSELL_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-fg-quiet">
                {UPSELL_TYPES[/** @type {keyof typeof UPSELL_TYPES} */ (draft.type)]?.hint}
              </span>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Beløb ({currency}
              {draft.type === "temporary_mrr" ? " pr. md." : ""})
              <input
                className={`${inputCls} tabular-nums`}
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Afdeling (til rentabilitet)
              <select
                className={inputCls}
                value={draft.department}
                onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
              >
                <option value="">— ingen —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              {draft.type === "temporary_mrr" ? "Fra måned" : "Måned aftalen gælder for"}
              <input
                type="month"
                className={inputCls}
                value={draft.periodFrom}
                onChange={(e) => setDraft((d) => ({ ...d, periodFrom: e.target.value }))}
              />
            </label>
            {draft.type === "temporary_mrr" ?
              <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
                Til og med måned
                <input
                  type="month"
                  className={inputCls}
                  value={draft.periodTo}
                  min={draft.periodFrom}
                  onChange={(e) => setDraft((d) => ({ ...d, periodTo: e.target.value }))}
                />
                <span className="text-[10px] text-fg-quiet">Tom = kun startmåneden.</span>
              </label>
            : null}
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Solgt af
              {team.length ?
                <select className={inputCls} value={draft.soldByKey} onChange={(e) => pickSeller(e.target.value)}>
                  <option value="">Vælg…</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              : <input
                  className={inputCls}
                  value={draft.soldBy}
                  onChange={(e) => setDraft((d) => ({ ...d, soldBy: e.target.value }))}
                />
              }
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-fg-soft">
              Solgt dato
              <input
                type="date"
                className={inputCls}
                value={draft.soldAt}
                onChange={(e) => setDraft((d) => ({ ...d, soldAt: e.target.value }))}
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[11px] text-fg-soft">
            Beskrivelse (maks. {UPSELL_DESCRIPTION_MAX_WORDS} ord)
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
            <span
              className={`text-[10px] tabular-nums ${words > UPSELL_DESCRIPTION_MAX_WORDS ? "text-agency-bad" : "text-fg-quiet"}`}
            >
              {words} / {UPSELL_DESCRIPTION_MAX_WORDS} ord
            </span>
          </label>
          {error ?
            <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 text-[12px] text-agency-bad">
              {error}
            </p>
          : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-fg-muted hover:bg-surface-muted disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="button"
              disabled={busy || words > UPSELL_DESCRIPTION_MAX_WORDS}
              onClick={() => void save()}
              className="inline-flex h-9 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 text-[12px] font-semibold text-canvas disabled:opacity-50"
            >
              {busy ? "Gemmer…" : "Gem opsalg"}
            </button>
          </div>
        </div>
      : null}

      {upsells.length === 0 ?
        <p className="mt-4 text-[12px] text-fg-quiet">Ingen opsalg registreret endnu.</p>
      : <ul className="mt-4 divide-y divide-border-muted">
          {upsells.map((u) => (
            <li key={u.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg">
                    {UPSELL_TYPES[u.type]?.label ?? u.type}
                  </span>
                  {activeIds.has(u.id) ?
                    <span className="rounded-full border border-agency-ok-border bg-agency-ok-soft px-2 py-0.5 text-[10px] font-semibold text-agency-ok">
                      Aktiv i perioden
                    </span>
                  : u.type === "mrr_increase" ?
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-quiet">
                      Indgår i MRR
                    </span>
                  : null}
                  {u.department ?
                    <span className="text-[11px] text-fg-quiet">{deptName(u.department)}</span>
                  : null}
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-fg">
                  {formatCurrency(u.amount, u.currency || currency)}
                  {u.type === "temporary_mrr" ? " / md" : ""}
                </span>
              </div>
              <div className="text-[11px] text-fg-quiet">
                Gælder {formatUpsellPeriodDa(u)} · solgt af {u.soldBy}
                {u.soldAt ? ` den ${formatIsoDateDa(u.soldAt)}` : ""}
              </div>
              {u.description ? <p className="text-[12px] text-fg-muted">{u.description}</p> : null}
              {canEdit ?
                <div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(u.id)}
                    className="text-[11px] font-medium text-agency-bad hover:underline disabled:opacity-50"
                  >
                    Slet
                  </button>
                </div>
              : null}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}