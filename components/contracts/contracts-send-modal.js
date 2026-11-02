"use client";

import { useCallback, useEffect, useState } from "react";

import { ClientPicklistOptions } from "@/components/crm/client-picklist-options";
import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] text-fg";
const LABEL_CLASS = "block font-sans text-[12px] font-medium text-fg-muted";

const CONTRACT_TYPES = [
  { value: "retainer", label: "Retainer (løbende)" },
  { value: "project", label: "Projekt" },
  { value: "one_off", label: "Engangsopgave" },
  { value: "subscription", label: "Abonnement" },
];

/** @param {string} raw */
function parseAmount(raw) {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * @param {{ title: string; children: import('react').ReactNode }} props
 */
function Section({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-border-soft pt-3 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   onSent: () => void;
 *   clients: Array<{ id: string; mongoId: string; name: string; status: string; groupName?: string }>;
 *   departments?: Array<{ key: string; name: string }>;
 *   team?: Array<{ id: string; name: string }>;
 * }} props
 */
export function ContractsSendModal({ open, onClose, onSent, clients, departments = [], team = [] }) {
  const dataSource = useDataSource();
  const [templates, setTemplates] = useState(
    /** @type {Array<{ id: string; key: string; name: string }>} */ ([]),
  );
  const [mode, setMode] = useState(/** @type {"existing" | "new"} */ ("existing"));
  const [clientMongoId, setClientMongoId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("retainer");
  const [services, setServices] = useState(/** @type {string[]} */ ([]));
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("DKK");
  const [startDate, setStartDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [noticeDays, setNoticeDays] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Ny kunde
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [cvr, setCvr] = useState("");
  const [industry, setIndustry] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [ownerMemberKey, setOwnerMemberKey] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");

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

  /** @param {string} key */
  const toggleService = useCallback((key) => {
    setServices((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }, []);

  const submit = useCallback(async () => {
    if (dataSource === "demo") {
      setError("Skift til database-kilde for at sende kontrakter");
      return;
    }
    if (mode === "existing" && !clientMongoId) {
      setError("Vælg en kunde");
      return;
    }
    if (mode === "new") {
      if (name.trim().length < 2) return setError("Angiv kundens firmanavn");
      if (contactName.trim().length < 2) return setError("Angiv navnet på underskriveren");
      if (!contactEmail.trim()) return setError("Angiv underskriverens e-mail");
    }

    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const qs = databaseApiQuery();
      const noticeParsed = noticeDays.trim() ? Number(noticeDays) : undefined;
      const res = await fetch(`/api/contracts/send?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "existing" ?
            { clientId: clientMongoId, contactEmail: contactEmail.trim() || undefined }
          : {
              newClient: {
                name: name.trim(),
                domain: domain.trim(),
                cvr: cvr.trim(),
                industry: industry.trim(),
                leadSource: leadSource.trim(),
                ownerMemberKey,
                contactName: contactName.trim(),
                contactTitle: contactTitle.trim(),
                contactEmail: contactEmail.trim(),
                contactPhone: contactPhone.trim(),
              },
            }),
          templateId: templateId || undefined,
          label: label.trim() || undefined,
          type,
          servicesActive: services,
          value: parseAmount(value),
          currency,
          startDate: startDate || undefined,
          renewalDate: renewalDate || undefined,
          noticeDays: Number.isFinite(noticeParsed) ? noticeParsed : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke sende");
      setOkMsg(
        `Sendt til ${data.signerEmail ?? "kunden"}${
          mode === "new" ? " — kunden oprettes, når aftalen er underskrevet" : ""
        }${data.debugAccessCode ? ` (dev-kode: ${data.debugAccessCode})` : ""}`,
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
    contactName,
    contactPhone,
    contactTitle,
    currency,
    cvr,
    dataSource,
    domain,
    industry,
    label,
    leadSource,
    mode,
    name,
    noticeDays,
    onSent,
    ownerMemberKey,
    renewalDate,
    services,
    startDate,
    templateId,
    type,
    value,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="tally-panel flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden p-0 shadow-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-sans text-[16px] font-semibold text-fg">Send kontrakt til underskrift</h2>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            Modtageren får en e-mail med link og adgangskode (Postmark).
          </p>
          <div
            role="tablist"
            aria-label="Kunde"
            className="mt-3 inline-flex rounded-full border border-border bg-surface-muted p-0.5"
          >
            {[
              { id: "existing", label: "Eksisterende kunde" },
              { id: "new", label: "Ny kunde" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={mode === opt.id}
                onClick={() => setMode(/** @type {"existing" | "new"} */ (opt.id))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-sans text-[12px] font-medium transition",
                  mode === opt.id ? "bg-canvas text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {mode === "existing" ?
            <Section title="Kunde">
              <label className={LABEL_CLASS}>
                Kunde *
                <select
                  value={clientMongoId}
                  onChange={(e) => setClientMongoId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Vælg kunde…</option>
                  <ClientPicklistOptions
                    items={clients.map((c) => ({
                      value: c.mongoId,
                      label: c.name,
                      group: c.groupName,
                    }))}
                  />
                </select>
              </label>
              <label className={LABEL_CLASS}>
                Underskriver e-mail (valgfri)
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  type="email"
                  className={INPUT_CLASS}
                  placeholder="Primær kontakt bruges ellers"
                />
              </label>
            </Section>
          : <>
              <p className="rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 py-2 font-sans text-[12px] leading-relaxed text-agency-brand">
                Kunden oprettes først, når aftalen er underskrevet. Så oprettes kunden i CRM&apos;et
                med oplysningerne herunder, og alle brugere får en besked.
              </p>
              <Section title="Virksomhed">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={LABEL_CLASS}>
                    Firmanavn *
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Fx Drilon ApS"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Domæne / website
                    <input
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="drilon.dk"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    CVR
                    <input
                      value={cvr}
                      onChange={(e) => setCvr(e.target.value)}
                      inputMode="numeric"
                      className={INPUT_CLASS}
                      placeholder="8 cifre"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Branche
                    <input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Fx E-commerce"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Kundeansvarlig
                    <select
                      value={ownerMemberKey}
                      onChange={(e) => setOwnerMemberKey(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">Ingen valgt</option>
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL_CLASS}>
                    Lead-kilde
                    <input
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Fx Anbefaling"
                    />
                  </label>
                </div>
              </Section>
              <Section title="Underskriver (primær kontakt)">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={LABEL_CLASS}>
                    Navn *
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Titel
                    <input
                      value={contactTitle}
                      onChange={(e) => setContactTitle(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Fx Direktør"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    E-mail *
                    <input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      type="email"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Telefon
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      type="tel"
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>
              </Section>
            </>
          }

          <Section title="Aftale">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL_CLASS}>
                Skabelon
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={LABEL_CLASS}>
                Aftaletype
                <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_CLASS}>
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={LABEL_CLASS}>
              Aftalenavn
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={INPUT_CLASS}
                placeholder="Fx Retainer 2026"
              />
            </label>
            <div>
              <span className={LABEL_CLASS}>Service lines</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {departments.length === 0 ?
                  <span className="font-sans text-[12px] text-fg-quiet">Ingen afdelinger oprettet</span>
                : departments.map((d) => {
                    const on = services.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleService(d.key)}
                        className={cn(
                          "rounded-full border px-3 py-1 font-sans text-[12px] transition",
                          on ?
                            "border-agency-brand-border bg-agency-brand-soft font-medium text-agency-brand"
                          : "border-border text-fg-muted hover:bg-surface-muted hover:text-fg",
                        )}
                      >
                        {d.name}
                      </button>
                    );
                  })
                }
              </div>
            </div>
          </Section>

          <Section title="Økonomi og varighed">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
                Månedlig værdi (MRR)
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  inputMode="decimal"
                  className={INPUT_CLASS}
                  placeholder="Fx 25000"
                />
              </label>
              <label className={LABEL_CLASS}>
                Valuta
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="DKK">DKK</option>
                  <option value="EUR">EUR</option>
                  <option value="SEK">SEK</option>
                  <option value="NOK">NOK</option>
                </select>
              </label>
              <label className={LABEL_CLASS}>
                Startdato
                <input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  className={INPUT_CLASS}
                />
              </label>
              <label className={LABEL_CLASS}>
                Fornyelse
                <input
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  type="date"
                  className={INPUT_CLASS}
                />
              </label>
              <label className={LABEL_CLASS}>
                Opsigelsesvarsel (dage)
                <input
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(e.target.value)}
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  placeholder="90"
                />
              </label>
            </div>
          </Section>

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
