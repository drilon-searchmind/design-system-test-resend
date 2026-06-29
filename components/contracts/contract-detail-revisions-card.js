import { formatIsoDateDa } from "@/lib/crm/format-da";

/**
 * @param {{ entries: Array<{ id: string; at: string; kind: string; summary: string }> }} props
 */
export function ContractDetailRevisionsCard({ entries }) {
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Revisionsspor
      </h2>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Kronologisk liste over registrerede bilag og økonomiske noter — erstattes af versionsstyret Contract API.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {entries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-3 py-8 text-center text-[13px] text-fg-muted">
            Ingen hændelser registreret for denne aftale.
          </li>
        ) : (
          sorted.map((row) => (
            <li key={row.id} className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-fg-quiet">
                <span className="tabular-nums">{formatIsoDateDa(row.at)}</span>
                <span>·</span>
                <span className="font-semibold uppercase tracking-wide text-fg-soft">{row.kind}</span>
              </div>
              <p className="mt-2 leading-relaxed text-[13px] text-fg-muted">{row.summary}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
