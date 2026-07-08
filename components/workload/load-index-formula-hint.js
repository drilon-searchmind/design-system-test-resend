/**
 * @param {{ includeBarNote?: boolean }} [props]
 */
export function LoadIndexFormulaHintContent({ includeBarNote = false }) {
  return (
    <div className="space-y-2 font-sans text-[12px] leading-snug text-fg-muted">
      <p>Belægningsindex er et samlet pres-tal fra 0 til 100%.</p>
      <p className="rounded-md border border-border bg-surface-muted px-2 py-1.5 text-[11px] leading-relaxed text-fg">
        28 + (åbne × 11) + (HP × 8) + (Økr × 6) + disciplin-tillæg
      </p>
      <p className="text-[11px]">Højest 100%.</p>
      <ul className="list-inside list-disc space-y-1 text-[11px]">
        <li>
          <span className="text-fg">åbne</span> — antal åbne opgaver på personen
        </li>
        <li>
          <span className="text-fg">HP</span> — åbne opgaver med høj prioritet
        </li>
        <li>
          <span className="text-fg">Økr</span> — åbne opgaver med overskredet deadline
        </li>
        <li>
          <span className="text-fg">disciplin-tillæg</span> — +18 hvis afdelingen er meget travl, +8 hvis den er lidt
          travl, ellers 0
        </li>
      </ul>
      {includeBarNote ?
        <p>Workload-baren viser samme Index som en bar (fyldt = høj belastning, max 100%).</p>
      : null}
    </div>
  );
}
