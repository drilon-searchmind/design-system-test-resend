"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ClientPicklistOptions } from "@/components/crm/client-picklist-options";
import { useDataSource } from "@/components/crm/use-data-source";
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from "@/lib/crm/client-utils";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { renderContractDocumentHtml } from "@/lib/contracts/contract-document-html";
import {
  buildContractVars,
  withAgreementDetails,
} from "@/lib/contracts/contract-vars";
import { renderContractTemplateText } from "@/lib/email/contract-template-render";
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
export function ContractsSendModal({
  open,
  onClose,
  onSent,
  clients,
  departments = [],
  team = [],
}) {
  const dataSource = useDataSource();
  const [templates, setTemplates] = useState(
    /** @type {Array<{ id: string; key: string; name: string; subject: string; emailBodyMd: string; documentBodyMd: string; defaultType: string; defaultNoticeDays: number }>} */ ([]),
  );
  const [amounts, setAmounts] = useState(
    /** @type {Record<string, string>} */ ({}),
  );
  const [previewTab, setPreviewTab] = useState(
    /** @type {"email" | "document"} */ ("email"),
  );
  const [mode, setMode] = useState(
    /** @type {"existing" | "new"} */ ("existing"),
  );
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
          const res = await fetch(`/api/contract-templates?${qs}`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data.templates)) {
            setTemplates(
              data.templates.map((t) => ({
                id: String(t.id),
                key: String(t.key),
                name: String(t.name),
                subject: String(t.subject ?? ""),
                emailBodyMd: String(t.emailBodyMd ?? ""),
                documentBodyMd: String(t.documentBodyMd ?? ""),
                defaultType: String(t.defaultType ?? "retainer"),
                defaultNoticeDays: Number(t.defaultNoticeDays ?? 90),
              })),
            );
            if (data.templates[0]?.id)
              setTemplateId(String(data.templates[0].id));
          }
        } catch {
          /* ignore */
        }
      })();
    });
  }, [dataSource, open]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setError(null);
      setOkMsg(null);
      if (!clientMongoId && clients[0]?.mongoId)
        setClientMongoId(clients[0].mongoId);
    });
  }, [clients, clientMongoId, open]);

  /** @param {string} key */
  const toggleService = useCallback((key) => {
    setServices((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }, []);

  /** Linjer med beløb; summen er aftalens værdi. */
  const lines = useMemo(
    () =>
      services.map((key) => ({
        key,
        name:
          key === "oneoff-web"
            ? "Web"
            : (departments.find((d) => d.key === key)?.name ?? key),
        amount: parseAmount(amounts[key] ?? "") ?? 0,
      })),
    [services, amounts, departments],
  );
  const recurring = type === "retainer" || type === "subscription";
  /** Løbende aftale: Web (engangs) holdes uden for den månedlige værdi. */
  const total = useMemo(
    () =>
      lines.reduce(
        (s, l) => (recurring && l.key === "oneoff-web" ? s : s + l.amount),
        0,
      ),
    [lines, recurring],
  );
  const oneOffWebTotal = useMemo(
    () => lines.filter((l) => l.key === "oneoff-web").reduce((s, l) => s + l.amount, 0),
    [lines],
  );

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const preview = useMemo(() => {
    const t = selectedTemplate;
    if (!t) return null;
    const client =
      mode === "new"
        ? name.trim() || "[Firmanavn]"
        : (clients.find((x) => x.mongoId === clientMongoId)?.name ?? "[Kunde]");
    const vars = buildContractVars({
      clientName: client,
      signerName: contactName.trim() || "[Underskriver]",
      contractLabel: label.trim() || t.name,
      noticeDays: noticeDays.trim() || t.defaultNoticeDays,
      cvr: mode === "new" ? cvr.trim() : undefined,
      value: total > 0 ? total : parseAmount(value),
      currency,
      serviceLabels: [],
      serviceLines: lines,
      type,
      startDate: startDate || undefined,
      renewalDate: renewalDate || undefined,
    });
    const emailVars = {
      ...vars,
      signingUrl: "https://…/sign/[unikt-link]",
      accessCode: "[adgangskode]",
    };
    const body = renderContractTemplateText(
      withAgreementDetails(t.documentBodyMd, vars),
      vars,
    );
    return {
      subject: renderContractTemplateText(t.subject, emailVars),
      email: renderContractTemplateText(t.emailBodyMd, emailVars),
      html: renderContractDocumentHtml({
        title: label.trim() || t.name,
        clientName: client,
        bodyMd: body,
      }),
    };
  }, [
    selectedTemplate,
    contactName,
    mode,
    name,
    clients,
    clientMongoId,
    label,
    noticeDays,
    cvr,
    total,
    value,
    currency,
    lines,
    type,
    startDate,
    renewalDate,
  ]);

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
      if (contactName.trim().length < 2)
        return setError("Angiv navnet på underskriveren");
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
          ...(mode === "existing"
            ? {
                clientId: clientMongoId,
                contactEmail: contactEmail.trim() || undefined,
              }
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
          servicesActive: services.filter((k) => k !== "oneoff-web"),
          serviceLines: lines.map((l) => ({ key: l.key, amount: l.amount })),
          value: total > 0 ? total : parseAmount(value),
          currency,
          startDate: startDate || undefined,
          renewalDate: renewalDate || undefined,
          noticeDays: Number.isFinite(noticeParsed) ? noticeParsed : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          typeof data?.error === "string" ? data.error : "Kunne ikke sende",
        );
      setOkMsg(
        `Sendt til ${data.signerEmail ?? "kunden"}${
          mode === "new"
            ? " — kunden oprettes, når aftalen er underskrevet"
            : ""
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
    lines,
    total,
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
        className="tally-panel flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden p-0 shadow-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-sans text-[16px] font-semibold text-fg">
            Send kontrakt til underskrift
          </h2>
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
                onClick={() =>
                  setMode(/** @type {"existing" | "new"} */ (opt.id))
                }
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-sans text-[12px] font-medium transition",
                  mode === opt.id
                    ? "bg-canvas text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
            {mode === "existing" ? (
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
            ) : (
              <>
                <p className="rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 py-2 font-sans text-[12px] leading-relaxed text-agency-brand">
                  Kunden oprettes først, når aftalen er underskrevet. Så
                  oprettes kunden i CRM&apos;et med oplysningerne herunder, og
                  alle brugere får en besked.
                </p>
                <Section title="Virksomhed">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={LABEL_CLASS}>
                      Firmanavn *
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Fx Eksempel ApS"
                      />
                    </label>
                    <label className={LABEL_CLASS}>
                      Domæne / website
                      <input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="eksempel.dk"
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
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Vælg lead-kilde…</option>
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_SOURCE_LABELS[s] ?? s}
                          </option>
                        ))}
                      </select>{" "}
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
            )}

            <Section title="Aftale">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={LABEL_CLASS}>
                  Skabelon
                  <select
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value);
                      const t = templates.find((x) => x.id === e.target.value);
                      if (t) setType(t.defaultType);
                    }}
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
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={INPUT_CLASS}
                  >
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
                  {departments.length === 0 ? (
                    <span className="font-sans text-[12px] text-fg-quiet">
                      Ingen afdelinger oprettet
                    </span>
                  ) : (
                    [...departments, { key: "oneoff-web", name: "Web (engangs)" }].map(
                      (d) => {
                        const on = services.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleService(d.key)}
                            className={cn(
                              "rounded-full border px-3 py-1 font-sans text-[12px] transition",
                              on
                                ? "border-agency-brand-border bg-agency-brand-soft font-medium text-agency-brand"
                                : "border-border text-fg-muted hover:bg-surface-muted hover:text-fg",
                            )}
                          >
                            {d.name}
                          </button>
                        );
                      },
                    )
                  )}
                </div>
                {services.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {lines.map((l) => (
                      <label
                        key={l.key}
                        className="flex items-center gap-3 font-sans text-[12px] text-fg-muted"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {l.name}
                          {l.key === "oneoff-web" || !recurring
                            ? " (engang)"
                            : " (kr/md)"}
                        </span>
                        <input
                          value={amounts[l.key] ?? ""}
                          onChange={(e) =>
                            setAmounts((cur) => ({
                              ...cur,
                              [l.key]: e.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder="Beløb"
                          aria-label={`Beløb for ${l.name}`}
                          className="w-32 rounded-xl border border-border bg-canvas px-3 py-1.5 text-right text-[13px] text-fg"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                {recurring && oneOffWebTotal > 0 ? (
                  <p className="mt-2 font-sans text-[11px] leading-relaxed text-fg-quiet">
                    Web (engangs) på {oneOffWebTotal.toLocaleString("da-DK")} kr indgår ikke
                    i den månedlige værdi. Det registreres som et engangsopsalg i den måned
                    aftalen underskrives.
                  </p>
                ) : null}
                {mode === "existing" ? (
                  <p className="mt-2 font-sans text-[11px] leading-relaxed text-fg-quiet">
                    Opsalg til en eksisterende kunde sendes som en ny aftale.
                    Når den er underskrevet, tæller værdien med i kundens
                    samlede månedlige værdi.
                  </p>
                ) : null}
              </div>
            </Section>

            <Section title="Økonomi og varighed">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={cn(LABEL_CLASS, "sm:col-span-2")}>
                  {recurring ? "Månedlig værdi" : "Samlet engangsbeløb"}
                  <input
                    value={
                      services.length > 0
                        ? total.toLocaleString("da-DK")
                        : value
                    }
                    readOnly={services.length > 0}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="decimal"
                    className={cn(
                      INPUT_CLASS,
                      services.length > 0 && "bg-surface-muted font-semibold",
                    )}
                    placeholder="Summen af service lines"
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

            {error ? (
              <p className="font-sans text-[12px] text-agency-bad">{error}</p>
            ) : null}
            {okMsg ? (
              <p className="font-sans text-[12px] text-agency-ok">{okMsg}</p>
            ) : null}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-border bg-surface-muted/40 lg:flex">
            <div className="flex items-center gap-1 border-b border-border px-4 py-2.5">
              {[
                { id: "email", label: "E-mail" },
                { id: "document", label: "Kontrakt (PDF)" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setPreviewTab(/** @type {"email" | "document"} */ (t.id))
                  }
                  className={cn(
                    "rounded-full px-3 py-1 font-sans text-[12px] font-medium transition",
                    previewTab === t.id
                      ? "bg-canvas text-fg shadow-sm"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
              <span className="ml-auto font-sans text-[11px] text-fg-quiet">
                Live preview
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!preview ? (
                <p className="font-sans text-[12px] text-fg-quiet">
                  Vælg en skabelon for at se preview.
                </p>
              ) : previewTab === "email" ? (
                <div className="rounded-xl border border-border bg-canvas p-4">
                  <p className="font-sans text-[12px] text-fg-muted">Emne</p>
                  <p className="mb-3 font-sans text-[13px] font-semibold text-fg">
                    {preview.subject}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">
                    {preview.email}
                  </pre>
                </div>
              ) : (
                <iframe
                  title="Kontrakt preview"
                  srcDoc={preview.html}
                  sandbox=""
                  className="h-[60dvh] w-full rounded-xl border border-border bg-white"
                />
              )}
            </div>
          </aside>
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
