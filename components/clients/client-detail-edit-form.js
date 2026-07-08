"use client";

import {
  CHURN_REASON_LABELS,
  CHURN_REASONS,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
} from "@/lib/crm/client-utils";
import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

import { clientEditInputClass, clientEditTextareaClass } from "./client-detail-edit-actions";

/** @typedef {import('@/lib/crm/client-edit-utils').ClientEditDraft} ClientEditDraft */

const ALLOCATION_KEYS = [...DEPARTMENTS.map((d) => d.id), "clientMgmt"];

/**
 * @param {{
 *   draft: ClientEditDraft;
 *   onChange: (next: ClientEditDraft) => void;
 *   team: Array<{ id: string; name: string }>;
 * }} props
 */
export function ClientDetailEditForm({ draft, onChange, team }) {
  /** @param {Partial<ClientEditDraft>} patch */
  function patchDraft(patch) {
    onChange({ ...draft, ...patch });
  }

  /** @param {string} field */
  function setField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  /** @param {string} deptId */
  function toggleService(deptId) {
    const set = new Set(draft.servicesActive);
    if (set.has(deptId)) set.delete(deptId);
    else set.add(deptId);
    patchDraft({ servicesActive: [...set] });
  }

  /** @param {string} reason */
  function toggleChurnReason(reason) {
    const set = new Set(draft.churnReason);
    if (set.has(reason)) set.delete(reason);
    else set.add(reason);
    patchDraft({ churnReason: [...set] });
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Identitet & status
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Virksomhedsnavn" required>
            <input
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Slug (URL-nøgle)" required>
            <input
              value={draft.slug}
              onChange={(e) => setField("slug", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Branche">
            <input
              value={draft.industry}
              onChange={(e) => setField("industry", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="CVR">
            <input
              value={draft.cvr}
              onChange={(e) => setField("cvr", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Logo (initialer)">
            <input
              value={draft.logoInitials}
              maxLength={4}
              onChange={(e) => setField("logoInitials", e.target.value.toUpperCase())}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Hue (0–360)">
            <input
              type="number"
              min={0}
              max={360}
              value={draft.hue}
              onChange={(e) => setField("hue", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) =>
                patchDraft({ status: /** @type {ClientEditDraft['status']} */ (e.target.value) })
              }
              className={clientEditInputClass}
            >
              <option value="active">Aktiv</option>
              <option value="paused">Pause</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </Field>
          <Field label="Sundhed">
            <select
              value={draft.health}
              onChange={(e) =>
                patchDraft({ health: /** @type {ClientEditDraft['health']} */ (e.target.value) })
              }
              className={clientEditInputClass}
            >
              <option value="ok">OK</option>
              <option value="warn">Advarsel</option>
              <option value="bad">Kritisk</option>
            </select>
          </Field>
          <Field label="Account owner">
            <select
              value={draft.ownerMemberKey}
              onChange={(e) => setField("ownerMemberKey", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="">—</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sidst aktiv (label)">
            <input
              value={draft.lastActivityLabel}
              onChange={(e) => setField("lastActivityLabel", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Tags (kommasepareret)" className="sm:col-span-2">
            <input
              value={draft.tagsText}
              onChange={(e) => setField("tagsText", e.target.value)}
              className={clientEditInputClass}
              placeholder="Retainer, Strategisk"
            />
          </Field>
        </div>
      </div>

      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Økonomi & ClickUp
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Retainer (md)">
            <input
              type="number"
              value={draft.retainerAmount}
              onChange={(e) => setField("retainerAmount", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Valuta">
            <input
              value={draft.currency}
              onChange={(e) => setField("currency", e.target.value.toUpperCase())}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Marketing start MRR">
            <input
              type="number"
              value={draft.marketingStartMrr}
              onChange={(e) => setField("marketingStartMrr", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Marketing opsalg MRR">
            <input
              type="number"
              value={draft.marketingUpsellMrr}
              onChange={(e) => setField("marketingUpsellMrr", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Aftaletype">
            <input
              value={draft.agreementType}
              onChange={(e) => setField("agreementType", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Prisregulering (%)">
            <input
              type="number"
              step="0.01"
              value={draft.annualAdjustmentPct}
              onChange={(e) => setField("annualAdjustmentPct", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="ClickUp task-id">
            <input
              value={draft.customerClickUpId}
              onChange={(e) => setField("customerClickUpId", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="ClickUp task-navn">
            <input
              value={draft.clickUpTaskName}
              onChange={(e) => setField("clickUpTaskName", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Google Drive URL" className="sm:col-span-2">
            <input
              type="url"
              value={draft.googleDriveUrl}
              onChange={(e) => setField("googleDriveUrl", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Lead source">
            <select
              value={draft.leadSource}
              onChange={(e) => setField("leadSource", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="">—</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {LEAD_SOURCE_LABELS[src]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Datoer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Startdato">
            <input
              type="date"
              value={draft.startedAt}
              onChange={(e) => setField("startedAt", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Fornyelse">
            <input
              type="date"
              value={draft.renewalAt}
              onChange={(e) => setField("renewalAt", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Opsagt">
            <input
              type="date"
              value={draft.terminatedAt}
              onChange={(e) => setField("terminatedAt", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Sidst kontaktet">
            <input
              type="date"
              value={draft.lastContactedAt}
              onChange={(e) => setField("lastContactedAt", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-fg-muted">Opsigelsesgrund</p>
          <div className="flex flex-wrap gap-2">
            {CHURN_REASONS.map((reason) => (
              <label
                key={reason}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                  draft.churnReason.includes(reason)
                    ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                    : "border-border bg-surface-muted text-fg-muted",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={draft.churnReason.includes(reason)}
                  onChange={() => toggleChurnReason(reason)}
                />
                {CHURN_REASON_LABELS[reason]}
              </label>
            ))}
          </div>
          <Field label="Opsigelsesnote" className="mt-3">
            <textarea
              value={draft.churnNote}
              onChange={(e) => setField("churnNote", e.target.value)}
              className={clientEditTextareaClass}
            />
          </Field>
        </div>
      </div>

      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Leverance & NPS
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Timebudget (t/md)">
            <input
              type="number"
              step="0.1"
              value={draft.hoursBudget}
              onChange={(e) => setField("hoursBudget", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Margin (decimal, fx 0.31)">
            <input
              type="number"
              step="0.01"
              value={draft.monthlyProfitMargin}
              onChange={(e) => setField("monthlyProfitMargin", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="NPS-cyklus">
            <select
              value={draft.npsInterval}
              onChange={(e) => setField("npsInterval", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="monthly">Månedlig</option>
              <option value="quarterly">Kvartalsvis</option>
              <option value="biannual">Halvårlig</option>
            </select>
          </Field>
        </div>

        <p className="mt-4 text-[11px] font-medium text-fg-muted">Aktive services</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEPARTMENTS.map((d) => (
            <label
              key={d.id}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
                draft.servicesActive.includes(d.id)
                  ? "border-agency-ok-border bg-agency-ok-soft text-agency-ok"
                  : "border-border bg-surface-muted text-fg-muted",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={draft.servicesActive.includes(d.id)}
                onChange={() => toggleService(d.id)}
              />
              {d.short}
            </label>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium text-fg-muted">Allokering (%)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALLOCATION_KEYS.map((key) => (
            <Field key={key} label={key}>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.allocationPct[key] ?? ""}
                onChange={(e) =>
                  patchDraft({
                    allocationPct: { ...draft.allocationPct, [key]: e.target.value },
                  })
                }
                className={clientEditInputClass}
              />
            </Field>
          ))}
        </div>

        {draft.servicesActive.length > 0 ? (
          <>
            <p className="mt-4 text-[11px] font-medium text-fg-muted">Ansvarlige pr. disciplin</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {draft.servicesActive.map((deptId) => {
                const dep = DEPARTMENTS.find((d) => d.id === deptId);
                const deptLabel = dep ? `${dep.short} · ${dep.name}` : deptId;
                return (
                  <Field key={deptId} label={deptLabel}>
                    <select
                      value={draft.deptAssignees[deptId] ?? ""}
                      onChange={(e) =>
                        patchDraft({
                          deptAssignees: { ...draft.deptAssignees, [deptId]: e.target.value },
                        })
                      }
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
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2">
        <ContactSection
          title="Primær kontakt"
          prefix="primaryContact"
          draft={draft}
          onChange={onChange}
        />
        <ContactSection
          title="Sekundær kontakt"
          prefix="secondaryContact"
          draft={draft}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

/**
 * @param {{ label: string; required?: boolean; className?: string; children: import('react').ReactNode }} props
 */
function Field({ label, required, className, children }) {
  return (
    <label className={cn("flex flex-col gap-1 font-sans text-[12px] text-fg-muted", className)}>
      <span>
        {label}
        {required ? <span className="text-agency-bad"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

/**
 * @param {{
 *   title: string;
 *   prefix: 'primaryContact' | 'secondaryContact';
 *   draft: ClientEditDraft;
 *   onChange: (next: ClientEditDraft) => void;
 * }} props
 */
function ContactSection({ title, prefix, draft, onChange }) {
  /** @param {string} suffix */
  function setContactField(suffix, value) {
    onChange({ ...draft, [`${prefix}${suffix}`]: value });
  }

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{title}</h2>
      <div className="mt-4 grid gap-3">
        <Field label="Navn">
          <input
            value={draft[`${prefix}Name`]}
            onChange={(e) => setContactField("Name", e.target.value)}
            className={clientEditInputClass}
          />
        </Field>
        <Field label="Titel">
          <input
            value={draft[`${prefix}Title`]}
            onChange={(e) => setContactField("Title", e.target.value)}
            className={clientEditInputClass}
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={draft[`${prefix}Email`]}
            onChange={(e) => setContactField("Email", e.target.value)}
            className={clientEditInputClass}
          />
        </Field>
        <Field label="Telefon">
          <input
            value={draft[`${prefix}Phone`]}
            onChange={(e) => setContactField("Phone", e.target.value)}
            className={clientEditInputClass}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            type="url"
            value={draft[`${prefix}Linkedin`]}
            onChange={(e) => setContactField("Linkedin", e.target.value)}
            className={clientEditInputClass}
          />
        </Field>
      </div>
    </div>
  );
}
