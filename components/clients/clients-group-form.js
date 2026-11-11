"use client";

import { useMemo, useState } from "react";

import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";
import { defaultGroupName, normalizeCvr } from "@/lib/crm/client-groups";
import { cn } from "@/lib/utils";

/**
 * Gruppér eksisterende kunder: de valgte brands får samme CVR og bliver én kundegruppe.
 *
 * @param {{
 *   clients: import('@/lib/crm/pulse-types').PulseClient[];
 *   submitting?: boolean;
 *   error?: string | null;
 *   onSubmit: (body: { name: string; cvr?: string; memberSlugs: string[] }) => void;
 *   onCancel: () => void;
 * }} props
 */
export function ClientsGroupForm({ clients, submitting = false, error = null, onSubmit, onCancel }) {
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [nameDraft, setNameDraft] = useState(/** @type {string | null} */ (null));
  const [cvrDraft, setCvrDraft] = useState(/** @type {string | null} */ (null));

  const selectedClients = useMemo(
    () => clients.filter((c) => selected.has(c.id)),
    [clients, selected],
  );

  // Foreslå CVR/navn ud fra valget; brugerens egne rettelser vinder.
  // Kun hvis ALLE valgte deler samme CVR; ellers laves en manuel kundegruppe på tværs af CVR'er.
  const suggestedCvr = useMemo(() => {
    if (selectedClients.length < 2) return "";
    const keys = new Set(selectedClients.map((c) => normalizeCvr(c.cvr)));
    return keys.size === 1 ? ([...keys][0] ?? "") : "";
  }, [selectedClients]);

  const suggestedName = useMemo(() => {
    const existing = selectedClients.find((c) => c.groupName)?.groupName;
    return existing ?? (selectedClients.length ? defaultGroupName(selectedClients) : "");
  }, [selectedClients]);

  const name = nameDraft ?? suggestedName;
  const cvr = cvrDraft ?? suggestedCvr;
  const cvrKey = normalizeCvr(cvr);

  const visible = useMemo(() => {
    const ql = query.trim().toLowerCase();
    const list = ql ? clients.filter((c) => c.name.toLowerCase().includes(ql)) : clients;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "da"));
  }, [clients, query]);

  // CVR er valgfrit; hvis udfyldt skal det være gyldigt.
  const cvrValid = cvr.trim() === "" || cvrKey.length === 8;
  const canSubmit = selected.size >= 2 && name.trim().length > 0 && cvrValid && !submitting;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), cvr: cvrKey || undefined, memberSlugs: [...selected] });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="font-sans text-[12.5px] leading-snug text-fg-muted">
        Vælg to eller flere kunder, der skal fungere som én kunde (kundegruppe) med samlet MRR — hvert
        brand beholder sine egne opgaver, timer og kontrakter. Har de samme CVR, så udfyld det; har de
        forskellige CVR&apos;er (flere selskaber under samme kunde), så lad CVR stå tomt — hvert brand
        beholder sit eget CVR.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Kundegruppenavn
          </span>
          <input
            value={name}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="fx FB Trading"
            className={clientEditInputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Fælles CVR (valgfrit)
          </span>
          <input
            value={cvr}
            onChange={(e) => setCvrDraft(e.target.value)}
            inputMode="numeric"
            placeholder="Tomt = forskellige CVR'er"
            className={cn(clientEditInputClass, "tabular-nums")}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Kunder ({selected.size} valgt)
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg…"
            className={cn(clientEditInputClass, "max-w-[180px]")}
          />
        </div>
        <ul className="max-h-[280px] overflow-y-auto rounded-lg border border-border bg-surface-muted/40">
          {visible.map((c) => {
            const checked = selected.has(c.id);
            return (
              <li key={c.id} className="border-b border-border-soft last:border-b-0">
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="size-4 accent-[var(--agency-brand)]"
                  />
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-md text-[9.5px] font-semibold text-white"
                    style={{ background: `oklch(62% 0.14 ${c.hue})` }}
                  >
                    {c.logo}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-fg">{c.name}</span>
                  {c.groupName ?
                    <span className="shrink-0 truncate font-sans text-[11px] text-agency-brand">
                      i {c.groupName}
                    </span>
                  : c.cvr ?
                    <span className="shrink-0 font-sans text-[11px] tabular-nums text-fg-quiet">
                      CVR {c.cvr}
                    </span>
                  : null}
                </label>
              </li>
            );
          })}
          {visible.length === 0 ?
            <li className="px-3 py-4 text-center font-sans text-[12px] text-fg-quiet">Ingen kunder fundet</li>
          : null}
        </ul>
      </div>

      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12.5px] text-agency-bad">
          {error}
        </p>
      : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-[34px] items-center rounded-md border border-border bg-surface-muted px-4 font-sans text-[13px] font-medium text-fg-muted hover:text-fg disabled:opacity-40"
        >
          Annullér
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-[34px] items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-4 font-sans text-[13px] font-medium text-agency-brand disabled:opacity-40"
        >
          {submitting ? "Grupperer…" : "Opret kundegruppe"}
        </button>
      </div>
    </form>
  );
}
