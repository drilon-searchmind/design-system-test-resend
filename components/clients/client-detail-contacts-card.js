/**
 * @param {{
 *   primaryContact: import('@/lib/crm/static-data').CLIENTS[number]['primaryContact'];
 *   secondaryContact?: import('@/lib/crm/static-data').CLIENTS[number]['secondaryContact'];
 * }} props
 */
export function ClientDetailContactsCard({ primaryContact, secondaryContact }) {
  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Kontakter
      </h2>
      <ul className="mt-4 space-y-5 font-sans text-sm">
        <li className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
          <p className="font-medium text-fg">{primaryContact.name}</p>
          <p className="mt-0.5 text-[13px] text-fg-muted">{primaryContact.title}</p>
          <a
            href={`mailto:${primaryContact.email}`}
            className="mt-2 block text-[12px] text-agency-brand hover:underline"
          >
            {primaryContact.email}
          </a>
          <p className="mt-1 text-[12px] tabular-nums text-fg-quiet">{primaryContact.phone}</p>
        </li>
        {secondaryContact ? (
          <li className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
            <p className="font-medium text-fg">{secondaryContact.name}</p>
            <p className="mt-0.5 text-[13px] text-fg-muted">{secondaryContact.title}</p>
            <a
              href={`mailto:${secondaryContact.email}`}
              className="mt-2 block text-[12px] text-agency-brand hover:underline"
            >
              {secondaryContact.email}
            </a>
            {secondaryContact.phone ? (
              <p className="mt-1 text-[12px] tabular-nums text-fg-quiet">
                {secondaryContact.phone}
              </p>
            ) : null}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
