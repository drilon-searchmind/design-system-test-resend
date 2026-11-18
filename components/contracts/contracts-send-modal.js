"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ClientPicklistOptions } from "@/components/crm/client-picklist-options";
import { useDataSource } from "@/components/crm/use-data-source";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import {
  INDUSTRY_OPTIONS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
} from "@/lib/crm/client-utils";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { renderContractDocumentHtml } from "@/lib/contracts/contract-document-html";
import {
  SERVICE_BILLING_OPTIONS,
  summarizeServiceLines,
} from "@/lib/contracts/contract-services";
import {
  buildContractVars,
  withAgreementDetails,
} from "@/lib/contracts/contract-vars";
import { renderContractTemplateText } from "@/lib/email/contract-template-render";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-canvas px-3 font-sans text-[13px] text-fg placeholder:text-fg-quiet outline-none transition-colors focus-visible:border-agency-brand-border focus-visible:ring-2 focus-visible:ring-agency-brand/40";
const READONLY_INPUT_CLASS =
  "flex h-9 w-full items-center rounded-lg border border-border-soft bg-surface-muted px-3 font-sans text-[13px] font-semibold tabular-nums text-fg";

const CONTRACT_TYPES = [
  { value: "retainer", label: "Retainer (løbende)" },
  { value: "project", label: "Projekt" },
  { value: "one_off", label: "Engangsopgave" },
  { value: "subscription", label: "Abonnement" },
];

const BILLING_GROUP_LABEL = /** @type {Record<string, string>} */ ({
  monthly: "Løbende",
  one_off: "Engangs",
  annual: "Årlig",
});

/** @param {string} raw */
function parseAmount(raw) {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** @param {number} n */
function formatKr(n) {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 2 });
}

/**
 * @param {{ step: number; title: string; description?: string; children: import('react').ReactNode }} props
 */
function Section({ step, title, description, children }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-soft px-5 py-5 first:border-t-0 md:px-6">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full border border-agency-brand-border bg-agency-brand-soft font-sans text-[11px] font-semibold tabular-nums text-agency-brand"
        >
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="font-sans text-[14px] font-semibold text-fg">{title}</h3>
          {description ? (
            <p className="mt-0.5 font-sans text-[12px] leading-relaxed text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-4 md:pl-9">{children}</div>
    </section>
  );
}

/**
 * @param {{
 *   label: string;
 *   required?: boolean;
 *   hint?: string;
 *   className?: string;
 *   children: import('react').ReactNode;
 * }} props
 */
function Field({ label, required = false, hint, className, children }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-sans text-[12px] font-medium text-fg-muted">
        {label}
        {required ? <span className="text-agency-bad"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="font-sans text-[11px] leading-snug text-fg-quiet">{hint}</span>
      ) : null}
    </label>
  );
}

/** @param {{ children: import('react').ReactNode; tone?: "brand" | "warn" | "muted" }} props */
function Note({ children, tone = "muted" }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 font-sans text-[12px] leading-relaxed",
        tone === "brand" && "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
        tone === "warn" && "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
        tone === "muted" && "border-border-soft bg-surface-muted text-fg-muted",
      )}
    >
      {children}
    </p>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   onSent: () => void;
 *   clients: Array<{ id: string; mongoId: string; name: string; status: string; groupName?: string }>;
 *   services?: import('@/lib/contracts/contract-services').ContractServiceOption[];
 *   team?: Array<{ id: string; name: string }>;
 * }} props
 */
export function ContractsSendModal({
  open,
  onClose,
  onSent,
  clients,
  services: catalogue = [],
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
  const [mobilePane, setMobilePane] = useState(
    /** @type {"form" | "preview"} */ ("form"),
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

  useEffect(() => {
    if (!open) return;
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose, open]);

  const catalogueByKey = useMemo(
    () => new Map(catalogue.map((s) => [s.key, s])),
    [catalogue],
  );

  const catalogueGroups = useMemo(
    () =>
      SERVICE_BILLING_OPTIONS.map((opt) => ({
        billing: opt.value,
        items: catalogue.filter((s) => s.billing === opt.value),
      })).filter((g) => g.items.length > 0),
    [catalogue],
  );

  /** @param {string} key */
  const toggleService = useCallback(
    (key) => {
      if (services.includes(key)) {
        setServices((cur) => cur.filter((k) => k !== key));
        return;
      }
      setServices((cur) => (cur.includes(key) ? cur : [...cur, key]));
      const def = catalogueByKey.get(key)?.defaultAmount;
      if (def) {
        setAmounts((cur) =>
          cur[key] ? cur : { ...cur, [key]: def.toLocaleString("da-DK") },
        );
      }
    },
    [catalogueByKey, services],
  );

  /** Linjer med beløb; løbende aftaler: kun kr/md-linjer indgår i den månedlige værdi. */
  const lines = useMemo(
    () =>
      services.flatMap((key) => {
        const s = catalogueByKey.get(key);
        if (!s) return [];
        return [
          {
            key,
            name: s.name,
            billing: s.billing,
            departmentKey: s.departmentKey,
            amount: parseAmount(amounts[key] ?? "") ?? 0,
          },
        ];
      }),
    [services, amounts, catalogueByKey],
  );
  const summary = useMemo(() => summarizeServiceLines(lines, type), [lines, type]);
  const recurring = summary.recurring;
  const total = summary.value;
  const hasLines = lines.length > 0;

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const previewClientName =
    mode === "new"
      ? name.trim() || "[Firmanavn]"
      : (clients.find((x) => x.mongoId === clientMongoId)?.name ?? "[Kunde]");

  const preview = useMemo(() => {
    const t = selectedTemplate;
    if (!t) return null;
    const vars = buildContractVars({
      clientName: previewClientName,
      signerName: contactName.trim() || "[Underskriver]",
      contractLabel: label.trim() || t.name,
      noticeDays: noticeDays.trim() || t.defaultNoticeDays,
      cvr: mode === "new" ? cvr.trim() : undefined,
      value: hasLines ? total : parseAmount(value),
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
        clientName: previewClientName,
        bodyMd: body,
      }),
    };
  }, [
    selectedTemplate,
    previewClientName,
    contactName,
    mode,
    label,
    noticeDays,
    cvr,
    hasLines,
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
          servicesActive: lines.flatMap((l) =>
            l.billing !== "one_off" && l.departmentKey ? [l.departmentKey] : [],
          ),
          serviceLines: lines.map((l) => ({ key: l.key, amount: l.amount })),
          value: hasLines ? total : parseAmount(value),
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
    hasLines,
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
    startDate,
    templateId,
    type,
    value,
  ]);

  if (!open) return null;

  const valueLabel = recurring ? "Månedlig værdi" : "Samlet beløb";
  const unitFor = /** @param {string} billing */ (billing) =>
    billing === "one_off" ? "kr engang"
    : billing === "annual" ? "kr/år"
    : recurring ? "kr/md"
    : "kr";
  const offset = mode === "new" ? 2 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-send-title"
        className="tally-panel flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-b-none p-0 shadow-xl sm:h-[min(92dvh,920px)] sm:rounded-b-2xl"
      >
        <header className="flex flex-col gap-3 border-b border-border px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                Kontrakter
              </p>
              <h2
                id="contract-send-title"
                className="font-sans text-[18px] font-semibold tracking-tight text-fg"
              >
                Send kontrakt til underskrift
              </h2>
              <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
                Modtageren får en e-mail med link og adgangskode.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PulseSegmentedControl
              active={mode}
              onChange={(id) => setMode(/** @type {"existing" | "new"} */ (id))}
              tabs={[
                { id: "existing", label: "Eksisterende kunde" },
                { id: "new", label: "Ny kunde" },
              ]}
            />
            <PulseSegmentedControl
              size="sm"
              className="lg:hidden"
              active={mobilePane}
              onChange={(id) => setMobilePane(/** @type {"form" | "preview"} */ (id))}
              tabs={[
                { id: "form", label: "Udfyld" },
                { id: "preview", label: "Preview" },
              ]}
            />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div
            className={cn(
              "min-h-0 overflow-y-auto",
              mobilePane === "preview" && "hidden lg:block",
            )}
          >
            {mode === "existing" ? (
              <Section
                step={1}
                title="Kunde"
                description="Vælg kunden. Underskriveren er kundens primære kontakt, medmindre du angiver en anden e-mail."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Kunde" required>
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
                  </Field>
                  <Field label="Underskriver e-mail" hint="Valgfri — primær kontakt bruges ellers">
                    <input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      type="email"
                      className={INPUT_CLASS}
                      placeholder="navn@kunde.dk"
                    />
                  </Field>
                </div>
              </Section>
            ) : (
              <>
                <Section
                  step={1}
                  title="Virksomhed"
                  description="Kunden oprettes i CRM'et først, når aftalen er underskrevet — med oplysningerne herunder. Alle brugere får en besked."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Firmanavn" required>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Fx Eksempel ApS"
                      />
                    </Field>
                    <Field label="Domæne / website">
                      <input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="eksempel.dk"
                      />
                    </Field>
                    <Field label="CVR" hint="8 cifre">
                      <input
                        value={cvr}
                        onChange={(e) => setCvr(e.target.value)}
                        inputMode="numeric"
                        className={INPUT_CLASS}
                        placeholder="12345678"
                      />
                    </Field>
                    <Field label="Branche">
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Vælg branche…</option>
                        {INDUSTRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Kundeansvarlig">
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
                    </Field>
                    <Field label="Lead-kilde">
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
                      </select>
                    </Field>
                  </div>
                </Section>
                <Section
                  step={2}
                  title="Underskriver"
                  description="Primær kontakt hos kunden. Modtager kontrakten og bliver kundens primære kontakt."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Navn" required>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Titel">
                      <input
                        value={contactTitle}
                        onChange={(e) => setContactTitle(e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Fx Direktør"
                      />
                    </Field>
                    <Field label="E-mail" required>
                      <input
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        type="email"
                        className={INPUT_CLASS}
                        placeholder="navn@kunde.dk"
                      />
                    </Field>
                    <Field label="Telefon">
                      <input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        type="tel"
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>
                </Section>
              </>
            )}

            <Section
              step={offset + 1}
              title="Aftale og services"
              description="Skabelonen styrer e-mail og kontrakttekst. Vælg de services aftalen dækker, og angiv beløb pr. linje."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Skabelon">
                  <select
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value);
                      const t = templates.find((x) => x.id === e.target.value);
                      if (t) setType(t.defaultType);
                    }}
                    className={INPUT_CLASS}
                    disabled={templates.length === 0}
                  >
                    {templates.length === 0 ? (
                      <option value="">
                        {dataSource === "demo" ? "Kræver database-kilde" : "Indlæser…"}
                      </option>
                    ) : null}
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Aftaletype">
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
                </Field>
                <Field
                  label="Aftalenavn"
                  hint="Vises i e-mail, kontrakt og kontraktoversigten. Skabelonens navn bruges ellers."
                  className="sm:col-span-2"
                >
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Fx Retainer 2026"
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3">
                <span className="font-sans text-[12px] font-medium text-fg-muted">
                  Services
                </span>
                {catalogueGroups.length === 0 ? (
                  <Note>Ingen services i kataloget endnu.</Note>
                ) : (
                  catalogueGroups.map((g) => (
                    <div key={g.billing} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                      <span className="w-16 shrink-0 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                        {BILLING_GROUP_LABEL[g.billing]}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((s) => {
                          const on = services.includes(s.key);
                          return (
                            <button
                              key={s.key}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleService(s.key)}
                              className={cn(
                                "inline-flex h-7 items-center gap-1 rounded-full border px-3 font-sans text-[12px] transition-colors",
                                on
                                  ? "border-agency-brand-border bg-agency-brand-soft font-medium text-agency-brand"
                                  : "border-border text-fg-muted hover:bg-surface-muted hover:text-fg",
                              )}
                            >
                              <span aria-hidden className="text-[11px] leading-none">
                                {on ? "✓" : "+"}
                              </span>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {hasLines ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border-soft bg-surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                      <span>Linje</span>
                      <span className="w-44 text-right">Beløb</span>
                    </div>
                    <ul className="divide-y divide-border-soft">
                      {lines.map((l) => (
                        <li
                          key={l.key}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleService(l.key)}
                              aria-label={`Fjern ${l.name}`}
                              className="flex size-5 shrink-0 items-center justify-center rounded-full text-fg-quiet transition-colors hover:bg-surface-muted hover:text-agency-bad"
                            >
                              <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden>
                                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                              </svg>
                            </button>
                            <span className="truncate font-sans text-[13px] text-fg">{l.name}</span>
                            {l.billing !== "monthly" || !recurring ? (
                              <span className="shrink-0 rounded-full border border-border-soft px-1.5 py-px text-[10px] text-fg-muted">
                                {BILLING_GROUP_LABEL[l.billing]}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex w-44 items-center gap-2">
                            <input
                              value={amounts[l.key] ?? ""}
                              onChange={(e) =>
                                setAmounts((cur) => ({
                                  ...cur,
                                  [l.key]: e.target.value,
                                }))
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`Beløb for ${l.name}`}
                              className={cn(INPUT_CLASS, "h-8 text-right tabular-nums")}
                            />
                            <span className="w-14 shrink-0 font-sans text-[11px] text-fg-quiet">
                              {unitFor(l.billing)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {recurring && (summary.oneOff > 0 || summary.annual > 0) ? (
                  <Note>
                    {summary.oneOff > 0
                      ? `Engangslinjer (${formatKr(summary.oneOff)} kr) indgår ikke i den månedlige værdi — de registreres som engangsopsalg i den måned aftalen underskrives. `
                      : ""}
                    {summary.annual > 0
                      ? `Årlige linjer (${formatKr(summary.annual)} kr/år) faktureres årligt og lægges på kundens serviceaftale; i kontraktoversigtens MRR tæller de som 1/12 pr. måned (${formatKr(summary.annual / 12)} kr/md).`
                      : ""}
                  </Note>
                ) : null}
                {mode === "existing" ? (
                  <Note>
                    Opsalg til en eksisterende kunde sendes som en ny aftale. Når den er
                    underskrevet, tæller værdien med i kundens samlede månedlige værdi.
                  </Note>
                ) : null}
              </div>
            </Section>

            <Section
              step={offset + 2}
              title="Økonomi og varighed"
              description={
                hasLines
                  ? `${valueLabel} beregnes ud fra servicelinjerne.`
                  : "Angiv beløbet manuelt, eller vælg services ovenfor."
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={valueLabel} className="sm:col-span-2">
                  {hasLines ? (
                    <output className={READONLY_INPUT_CLASS} aria-live="polite">
                      {formatKr(total)}
                    </output>
                  ) : (
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      inputMode="decimal"
                      className={cn(INPUT_CLASS, "tabular-nums")}
                      placeholder="0"
                    />
                  )}
                </Field>
                <Field label="Valuta">
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
                </Field>
                <Field label="Startdato" hint="I dag, hvis tom">
                  <input
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    type="date"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Fornyelse">
                  <input
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    type="date"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Opsigelsesvarsel (dage)">
                  <input
                    value={noticeDays}
                    onChange={(e) => setNoticeDays(e.target.value)}
                    inputMode="numeric"
                    className={cn(INPUT_CLASS, "tabular-nums")}
                    placeholder={String(selectedTemplate?.defaultNoticeDays ?? 90)}
                  />
                </Field>
              </div>
            </Section>
          </div>

          <aside
            className={cn(
              "min-h-0 flex-col border-border bg-surface-muted lg:flex lg:border-l",
              mobilePane === "preview" ? "flex" : "hidden",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <PulseSegmentedControl
                size="sm"
                active={previewTab}
                onChange={(id) => setPreviewTab(/** @type {"email" | "document"} */ (id))}
                tabs={[
                  { id: "email", label: "E-mail" },
                  { id: "document", label: "Kontrakt (PDF)" },
                ]}
              />
              <span className="ml-auto inline-flex items-center gap-1.5 font-sans text-[11px] text-fg-quiet">
                <span aria-hidden className="size-1.5 rounded-full bg-agency-ok" />
                Live preview
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {!preview ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
                  <p className="max-w-xs font-sans text-[12px] leading-relaxed text-fg-quiet">
                    {dataSource === "demo"
                      ? "Preview kræver skabeloner fra database-kilden."
                      : "Vælg en skabelon for at se e-mail og kontrakt."}
                  </p>
                </div>
              ) : previewTab === "email" ? (
                <article className="overflow-hidden rounded-xl border border-border bg-canvas">
                  <dl className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-border-soft px-4 py-3 font-sans text-[12px]">
                    <dt className="text-fg-quiet">Til</dt>
                    <dd className="truncate text-fg-muted">
                      {contactEmail.trim() ||
                        (mode === "existing" ? "Primær kontakt" : "[e-mail]")}
                    </dd>
                    <dt className="text-fg-quiet">Emne</dt>
                    <dd className="font-semibold text-fg">{preview.subject}</dd>
                  </dl>
                  <pre className="whitespace-pre-wrap break-words px-4 py-4 font-sans text-[13px] leading-relaxed text-fg">
                    {preview.email}
                  </pre>
                </article>
              ) : (
                <iframe
                  title="Kontrakt preview"
                  srcDoc={preview.html}
                  sandbox=""
                  className="min-h-[60dvh] w-full flex-1 rounded-xl border border-border"
                />
              )}
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 border-t border-border bg-canvas px-5 py-3 md:px-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            {error ? (
              <p role="alert" className="font-sans text-[12px] font-medium text-agency-bad">
                {error}
              </p>
            ) : okMsg ? (
              <p role="status" className="font-sans text-[12px] font-medium text-agency-ok">
                {okMsg}
              </p>
            ) : (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-sans text-[12px] text-fg-muted">
                <span>
                  {valueLabel}{" "}
                  <span className="font-semibold tabular-nums text-fg">
                    {formatKr(hasLines ? total : (parseAmount(value) ?? 0))} {currency}
                  </span>
                </span>
                {recurring && summary.oneOff > 0 ? (
                  <span>
                    + engangs{" "}
                    <span className="tabular-nums text-fg">{formatKr(summary.oneOff)}</span>
                  </span>
                ) : null}
                {recurring && summary.annual > 0 ? (
                  <span>
                    + årligt{" "}
                    <span className="tabular-nums text-fg">{formatKr(summary.annual)}</span>
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-full border border-border px-4 font-sans text-[12px] font-medium text-fg transition-colors hover:bg-surface-muted"
            >
              {okMsg ? "Luk" : "Annuller"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className={cn(
                "h-9 rounded-full border border-agency-brand-border bg-agency-brand-soft px-5 font-sans text-[12px] font-semibold text-agency-brand transition-colors hover:bg-agency-brand-soft/80",
                busy && "opacity-50",
              )}
            >
              {busy ? "Sender…" : "Send til underskrift"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
