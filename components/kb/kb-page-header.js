import { IconDoc } from "@/components/crm/icons";
import { KbPageActions } from "@/components/kb/kb-page-actions";
import { formatIsoDateDa } from "@/lib/crm/format-da";

/**
 * @param {{
 *   stats: {
 *     totalPublished: number;
 *     drafts: number;
 *     sectionsUsed: number;
 *     lastUpdatedIso: string | null;
 *   };
 * }} props
 */
export function KbPageHeader({ stats }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          <IconDoc size={14} className="text-agency-brand" aria-hidden />
          Intern wiki
        </p>
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">Knowledge base</h1>
        <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
          Intern wiki med sektioner, underemner og procedurer — indhold oprettes og vedligeholdes her i Agency OS.
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-sans text-[11px] text-fg-muted">
          <div className="flex gap-1.5">
            <dt className="text-fg-soft">Publiceret</dt>
            <dd className="font-medium tabular-nums text-fg">{stats.totalPublished}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fg-soft">Kladder</dt>
            <dd className="font-medium tabular-nums text-fg">{stats.drafts}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fg-soft">Sektioner</dt>
            <dd className="font-medium tabular-nums text-fg">{stats.sectionsUsed}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fg-soft">Opdateret</dt>
            <dd className="font-medium text-fg">{formatIsoDateDa(stats.lastUpdatedIso ?? "")}</dd>
          </div>
        </dl>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <KbPageActions />
      </div>
    </header>
  );
}
