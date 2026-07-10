"use client";

import { useCallback, useState } from "react";

import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from "@/lib/crm/client-utils";
import { slugifyStableKey } from "@/lib/crm/slug-key";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   team: Array<{ id: string; name: string }>;
 *   submitting?: boolean;
 *   error?: string | null;
 *   onSubmit: (body: Record<string, unknown>) => void;
 *   onCancel: () => void;
 *   variant?: "modal" | "card";
 * }} props
 */
export function ClientsCreateForm({
  team,
  submitting = false,
  error = null,
  onSubmit,
  onCancel,
  variant = "modal",
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [industry, setIndustry] = useState("");
  const [cvr, setCvr] = useState("");
  const [status, setStatus] = useState("active");
  const [health, setHealth] = useState("ok");
  const [ownerMemberKey, setOwnerMemberKey] = useState("");
  const [retainerAmount, setRetainerAmount] = useState("");
  const [currency, setCurrency] = useState("DKK");
  const [hoursBudget, setHoursBudget] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [npsInterval, setNpsInterval] = useState("quarterly");
  const [leadSource, setLeadSource] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleNameChange = useCallback(
    (value) => {
      setName(value);
      if (!slugTouched) {
        setSlug(slugifyStableKey(value, "c"));
      }
    },
    [slugTouched],
  );

  const submit = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName || !trimmedSlug) return;

    /** @type {Record<string, unknown>} */
    const body = {
      name: trimmedName,
      slug: trimmedSlug,
      status,
      health,
      currency: currency.trim() || "DKK",
      npsInterval,
    };

    if (industry.trim()) body.industry = industry.trim();
    if (cvr.trim()) body.cvr = cvr.trim();
    if (ownerMemberKey.trim()) body.ownerMemberKey = ownerMemberKey.trim();
    if (leadSource.trim()) body.leadSource = leadSource.trim();
    if (startedAt.trim()) body.startedAt = startedAt.trim();

    const retainer = retainerAmount.trim() === "" ? Number.NaN : Number.parseFloat(retainerAmount.replace(",", "."));
    if (Number.isFinite(retainer)) body.retainerAmount = retainer;

    const budget = hoursBudget.trim() === "" ? Number.NaN : Number.parseFloat(hoursBudget.replace(",", "."));
    if (Number.isFinite(budget)) body.hoursBudget = budget;

    if (contactName.trim()) {
      body.primaryContact = {
        name: contactName.trim(),
        email: contactEmail.trim() || undefined,
        title: contactTitle.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      };
    }

    onSubmit(body);
  }, [
    contactEmail,
    contactName,
    contactPhone,
    contactTitle,
    cvr,
    currency,
    health,
    hoursBudget,
    industry,
    leadSource,
    name,
    npsInterval,
    onSubmit,
    ownerMemberKey,
    retainerAmount,
    slug,
    startedAt,
    status,
  ]);

  const isModal = variant === "modal";
  const canSubmit = name.trim().length > 0 && slug.trim().length > 0;

  return (
    <div
      className={cn(isModal ? "flex flex-col gap-5" : "tally-panel p-4 md:p-5")}
      role="region"
      aria-label={isModal ? "Opret ny kunde — formular" : "Opret kunde"}
    >
      {error ?
        <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Identitet</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Virksomhedsnavn *" className="sm:col-span-2">
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={clientEditInputClass}
              autoFocus
            />
          </Field>
          <Field label="Slug (URL-nøgle) *">
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="c-eksempel"
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Branche">
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="CVR">
            <input value={cvr} onChange={(e) => setCvr(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={clientEditInputClass}>
              <option value="active">Aktiv</option>
              <option value="paused">Pause</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </Field>
          <Field label="Sundhed">
            <select value={health} onChange={(e) => setHealth(e.target.value)} className={clientEditInputClass}>
              <option value="ok">OK</option>
              <option value="warn">Advarsel</option>
              <option value="bad">Kritisk</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Økonomi & ejerskab</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Account owner">
            <select
              value={ownerMemberKey}
              onChange={(e) => setOwnerMemberKey(e.target.value)}
              className={clientEditInputClass}
            >
              <option value="">— Ingen —</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Retainer (beløb)">
            <input
              type="text"
              inputMode="decimal"
              value={retainerAmount}
              onChange={(e) => setRetainerAmount(e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Valuta">
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Timebudget / md.">
            <input
              type="text"
              inputMode="decimal"
              value={hoursBudget}
              onChange={(e) => setHoursBudget(e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Startdato">
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Lead-kilde">
            <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className={clientEditInputClass}>
              <option value="">—</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {LEAD_SOURCE_LABELS[src] ?? src}
                </option>
              ))}
            </select>
          </Field>
          <Field label="NPS-cyklus">
            <select value={npsInterval} onChange={(e) => setNpsInterval(e.target.value)} className={clientEditInputClass}>
              <option value="monthly">Månedlig</option>
              <option value="quarterly">Kvartalsvis</option>
              <option value="biannual">Halvårlig</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Primær kontakt</h3>
        <p className="mt-1 font-sans text-[11px] text-fg-muted">
          Bruges bl.a. til NPS-udsendelser (e-mail til primær kontakt).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Navn">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Titel">
            <input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Telefon">
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={clientEditInputClass} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-9 items-center rounded-md border border-border px-4 font-sans text-[13px] text-fg-muted hover:text-fg disabled:opacity-40"
        >
          Annuller
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !canSubmit}
          className="inline-flex h-9 items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-4 font-sans text-[13px] font-medium text-agency-brand disabled:opacity-40"
        >
          {submitting ? "Opretter…" : "Opret kunde"}
        </button>
      </div>
    </div>
  );
}

/**
 * @param {{ label: string; children: import('react').ReactNode; className?: string }} props
 */
function Field({ label, children, className }) {
  return (
    <label className={cn("flex flex-col gap-1 font-sans text-[12px] text-fg-muted", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}
