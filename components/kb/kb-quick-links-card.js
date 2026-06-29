import Link from "next/link";

import { KNOWLEDGE_CATEGORIES } from "@/lib/crm/knowledge-data";
import { cn } from "@/lib/utils";

/** @param {{ className?: string }} props */
export function KbQuickLinksCard({ className }) {
  return (
    <div
      className={cn(
        "tally-panel p-4 md:p-[length:var(--ds-studio-pad-main)]",
        className,
      )}
    >
      <h2 className="font-sans text-sm font-semibold text-fg">Hurtige kategorier</h2>
      <p className="mt-1 font-sans text-[12px] leading-snug text-fg-muted">
        Filtrér artikellisten efter kategori.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              href={{ pathname: "/kb", query: { cat: c.id } }}
              className="group flex items-center justify-between rounded-lg border border-border-soft bg-surface-muted/40 px-2.5 py-2 transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/30"
            >
              <span className="font-sans text-[12px] font-medium text-fg group-hover:text-agency-brand">{c.name}</span>
              <span
                className="text-[10px] font-semibold text-fg-quiet"
                style={{ color: `oklch(0.72 0.06 ${c.deptHue})` }}
              >
                {c.short}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
