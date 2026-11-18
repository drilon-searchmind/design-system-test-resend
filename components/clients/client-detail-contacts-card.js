"use client";

import { patchClient, QuickEditPopover, QUICK_EDIT_DEMO_HINT } from "@/components/clients/client-quick-edit";

/** Pladsholder fra `client-detail-data` når kunden ikke har en primær kontakt. */
const EMPTY_PRIMARY_NAME = "Ingen primær kontakt registreret";

/** @type {import('@/components/clients/client-quick-edit').QuickEditField[]} */
const CONTACT_FIELDS = [
  { name: "name", label: "Navn", required: true },
  { name: "title", label: "Titel" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "phone", label: "Telefon", type: "tel" },
  { name: "linkedinUrl", label: "LinkedIn-URL", type: "url" },
];

/**
 * @typedef {import('@/lib/crm/static-data').CLIENTS[number]['primaryContact']} ClientContact
 */

/** @param {ClientContact | undefined} c */
function contactValues(c) {
  return {
    name: c?.name ?? "",
    title: c?.title ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    linkedinUrl: c?.linkedinUrl ?? "",
  };
}

/**
 * @param {{
 *   label: string;
 *   field: 'primaryContact' | 'secondaryContact';
 *   contact: ClientContact | undefined;
 *   clientSlug: string;
 *   canEdit: boolean;
 *   onSaved?: () => void;
 * }} props
 */
function ContactBlock({ label, field, contact, clientSlug, canEdit, onSaved }) {
  const hasContact = Boolean(contact?.name) && contact?.name !== EMPTY_PRIMARY_NAME;
  if (!hasContact && !canEdit) {
    return field === "primaryContact" ?
        <li className="rounded-xl border border-dashed border-border p-3 text-[13px] text-fg-muted">{EMPTY_PRIMARY_NAME}</li>
      : null;
  }

  return (
    <li className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
      <QuickEditPopover
        title={`${label} kontakt`}
        canEdit={canEdit}
        disabledHint={QUICK_EDIT_DEMO_HINT}
        className="flex w-full"
        triggerClassName="block w-full -m-1 p-1"
        fields={CONTACT_FIELDS}
        initialValues={contactValues(hasContact ? contact : undefined)}
        onSubmit={async (v) => {
          await patchClient(clientSlug, { [field]: { ...v, name: v.name.trim() } });
          onSaved?.();
        }}
        onRemove={
          hasContact ?
            async () => {
              await patchClient(clientSlug, { [field]: null });
              onSaved?.();
            }
          : undefined
        }
        removeLabel="Fjern kontakt"
      >
        {hasContact && contact ?
          <span className="block">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">{contact.name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                {label}
              </span>
            </span>
            {contact.title ? <span className="mt-0.5 block text-[13px] text-fg-muted">{contact.title}</span> : null}
            {contact.email ? <span className="mt-2 block text-[12px] text-agency-brand">{contact.email}</span> : null}
            {contact.phone ?
              <span className="mt-1 block text-[12px] tabular-nums text-fg-quiet">{contact.phone}</span>
            : null}
          </span>
        : <span className="block text-[12.5px] font-medium text-agency-brand">+ Tilføj {label.toLowerCase()} kontakt</span>}
      </QuickEditPopover>
      {hasContact && contact ?
        <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
          {contact.email ?
            <a href={`mailto:${contact.email}`} className="text-agency-brand hover:underline">
              Send mail
            </a>
          : null}
          {contact.linkedinUrl ?
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-agency-brand hover:underline"
            >
              LinkedIn
            </a>
          : null}
        </div>
      : null}
    </li>
  );
}

/**
 * Kontakter med inline-redigering: klik på en kontakt for at rette eller fjerne den.
 * @param {{
 *   primaryContact: ClientContact;
 *   secondaryContact?: ClientContact;
 *   clientSlug: string;
 *   canEdit?: boolean;
 *   onSaved?: () => void;
 * }} props
 */
export function ClientDetailContactsCard({ primaryContact, secondaryContact, clientSlug, canEdit = false, onSaved }) {
  return (
    <div className="tally-panel p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kontakter</h2>
        {canEdit ? <span className="font-sans text-[10.5px] text-fg-quiet">Klik for at redigere</span> : null}
      </div>
      <ul className="mt-4 space-y-3 font-sans text-sm">
        <ContactBlock
          label="Primær"
          field="primaryContact"
          contact={primaryContact}
          clientSlug={clientSlug}
          canEdit={canEdit}
          onSaved={onSaved}
        />
        <ContactBlock
          label="Sekundær"
          field="secondaryContact"
          contact={secondaryContact}
          clientSlug={clientSlug}
          canEdit={canEdit}
          onSaved={onSaved}
        />
      </ul>
    </div>
  );
}
