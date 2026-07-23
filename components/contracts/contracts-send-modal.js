"use client";

import { useCallback, useEffect, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   onSent: () => void;
 *   clients: Array<{ id: string; mongoId: string; name: string; status: string }>;
 * }} props
 */
export function ContractsSendModal({ open, onClose, onSent, clients }) {
  const dataSource = useDataSource();
  const [templates, setTemplates] = useState(
    /** @type {Array<{ id: string; key: string; name: string }>} */ ([]),
  );
  const [clientMongoId, setClientMongoId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [okMsg, setOkMsg] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open || dataSource === "demo") return;
    queueMicrotask(() => {
      void (async () => {
        try {
          const qs = databaseApiQuery();
          const res = await fetch(`/api/contract-templates?${qs}`, { cache: "no-store" });
          const data = await res.json();
          if (res.ok && Array.isArray(data.templates)) {
            setTemplates(
              data.templates.map((t) => ({
                id: String(t.id),
                key: String(t.key),
                name: String(t.name),
              })),
            );
            if (data.templates[0]?.id) setTemplateId(String(data.templates[0].id));
          }
        } catch {
          /* ignore */
        }
      })();
    });
  }, [dataSource, open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setOkMsg(null);
    if (!clientMongoId && clients[0]?.mongoId) setClientMongoId(clients[0].mongoId);
  }, [clients, clientMongoId, open]);

  const submit = useCallback(async () => {
    if (dataSource === "demo") {
      setError("Skift til database-kilde for at sende kontrakter");
      return;
    }
    if (!clientMongoId) {
      setError("Vælg en kunde");
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/contracts/send?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientMongoId,
          templateId: templateId || undefined,
          label: label.trim() || undefined,
          value: value.trim() ? Number(value) : undefined,
          contactEmail: contactEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke sende");
      setOkMsg(
        `Sendt til ${data.signerEmail ?? "kunden"}${
          data.debugAccessCode ? ` (dev-kode: ${data.debugAccessCode})` : ""
        }`,
      );
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }, [
    clientMongoId,
    contactEmail,
    dataSource,
    label,
    onSent,
    templateId,
    value,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="tally-panel w-full max-w-lg overflow-hidden p-0 shadow-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-sans text-[16px] font-semibold text-fg">Send kontrakt til underskrift</h2>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            Kunden får en e-mail med link og adgangskode (Postmark).
          </p>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <label className="block font-sans text-[12px] font-medium text-fg-muted">
            Kunde *
            <select
              value={clientMongoId}
              onChange={(e) => setClientMongoId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
            >
              <option value="">Vælg kunde…</option>
              {clients.map((c) => (
                <option key={c.mongoId} value={c.mongoId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-[12px] font-medium text-fg-muted">
            Skabelon
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-[12px] font-medium text-fg-muted">
            Aftalenavn
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
              placeholder="Fx Retainer 2026"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block font-sans text-[12px] font-medium text-fg-muted">
              Månedlig værdi (DKK)
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
              />
            </label>
            <label className="block font-sans text-[12px] font-medium text-fg-muted">
              Underskriver e-mail (valgfri)
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg"
                placeholder="Primær kontakt bruges ellers"
              />
            </label>
          </div>
          {error ? <p className="font-sans text-[12px] text-agency-bad">{error}</p> : null}
          {okMsg ? <p className="font-sans text-[12px] text-agency-ok">{okMsg}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 font-sans text-[12px] font-medium text-fg"
          >
            Luk
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={cn(
              "rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2 font-sans text-[12px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80",
              busy && "opacity-50",
            )}
          >
            {busy ? "Sender…" : "Send til underskrift"}
          </button>
        </div>
      </div>
    </div>
  );
}
