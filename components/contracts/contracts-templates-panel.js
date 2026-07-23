"use client";

import { useCallback, useEffect, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * Compact templates manager on the contracts page (mirrors opgaveskabeloner idea).
 */
export function ContractsTemplatesPanel() {
  const dataSource = useDataSource();
  const [templates, setTemplates] = useState(
    /** @type {Array<{ id: string; key: string; name: string; isDefault: boolean; active: boolean }>} */ (
      []
    ),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

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
          isDefault: Boolean(t.isDefault),
          active: t.active !== false,
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

  const create = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const autoKey =
        key.trim() ||
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      const res = await fetch(`/api/contract-templates?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: autoKey,
          name: name.trim(),
          subject: `Underskriv aftale med Searchmind — {{clientName}}`,
          emailBodyMd: `Hej {{signerName}},

Åbn linket for at underskrive aftalen med Searchmind for {{clientName}}:
{{signingUrl}}

Adgangskode: {{accessCode}}

Venlig hilsen
Searchmind`,
          documentBodyMd: `# Samarbejdsaftale

**Kunde:** {{clientName}}
**Dato:** {{today}}

## Ydelser
Searchmind leverer marketingydelser som aftalt.

## Opsigelse
Opsigelse med {{noticeDays}} dages varsel.

## Underskrift
Elektronisk underskrift er bindende for parten.
`,
          isDefault: templates.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette");
      setName("");
      setKey("");
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }, [key, load, name, templates.length]);

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-sans text-[14px] font-semibold text-fg">Kontraktskabeloner</h2>
          <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
            Genbrugelige aftale- og e-mailtekster (som opgaveskabeloner).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-full border border-border px-3 py-1.5 font-sans text-[11px] font-medium text-fg"
        >
          {creating ? "Annuller" : "Ny skabelon"}
        </button>
      </div>

      {creating ?
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navn"
            className="rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
          />
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Nøgle (valgfri)"
            className="rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
          />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void create()}
            className={cn(
              "self-start rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5 font-sans text-[11px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80",
              (busy || !name.trim()) && "opacity-50",
            )}
          >
            Opret
          </button>
        </div>
      : null}

      <div className="px-4 py-3">
        {loading ?
          <p className="font-sans text-[12px] text-fg-muted">Indlæser…</p>
        : error ?
          <p className="font-sans text-[12px] text-agency-bad">{error}</p>
        : templates.length === 0 ?
          <p className="font-sans text-[12px] text-fg-muted">
            {dataSource === "demo" ?
              "Skabeloner kræver database-kilde."
            : "Ingen skabeloner endnu — den første oprettes automatisk ved send."}
          </p>
        : <ul className="divide-y divide-border/70">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-medium text-fg">{t.name}</p>
                  <p className="font-mono text-[11px] text-fg-quiet">{t.key}</p>
                </div>
                {t.isDefault ?
                  <span className="rounded-md border border-border px-2 py-0.5 font-sans text-[10px] text-fg-muted">
                    Standard
                  </span>
                : null}
              </li>
            ))}
          </ul>
        }
      </div>
    </section>
  );
}
