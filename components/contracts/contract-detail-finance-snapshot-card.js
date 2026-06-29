import { formatCurrencyCompact } from "@/lib/crm/format-da";

/**
 * @param {{
 *   history: Array<{ month: string; retainer: number; currency: string }>;
 * }} props
 */
export function ContractDetailFinanceSnapshotCard({ history }) {
  const tail = [...(history ?? [])].slice(-4);

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Økonomi-snapshot (retainer-glid.)
      </h2>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Samme månedlige serie som på kunden — bruges til parity mellem aftale og faktiske linjer før sync til ERP.
      </p>
      {tail.length === 0 ? (
        <p className="mt-4 text-[13px] text-fg-muted">Ingen data.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2 text-[12px]">
          {tail.map((row) => (
            <li key={row.month} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-muted/35 px-3 py-2">
              <span className="tabular-nums text-fg-muted">{row.month}</span>
              <span className="tabular-nums font-semibold text-fg">{formatCurrencyCompact(row.retainer, row.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
