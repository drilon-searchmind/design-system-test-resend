"use client";

import { NPS_TEMPLATE_VARIABLES } from "@/lib/email/nps-template-variables";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   onInsert: (token: string) => void;
 *   className?: string;
 * }} props
 */
export function NpsTemplateVariablesPicker({ onInsert, className }) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border-soft bg-surface-muted/40 p-3", className)}>
      <p className="font-sans text-[11px] font-semibold text-fg">Tilgængelige variabler</p>
      <p className="mt-0.5 font-sans text-[10px] leading-snug text-fg-muted">
        Klik for at indsætte i det aktive felt (emne eller brødtekst).
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {NPS_TEMPLATE_VARIABLES.map((v) => (
          <li key={v.token}>
            <button
              type="button"
              onClick={() => onInsert(v.token)}
              className="group flex w-full min-w-0 flex-col gap-1 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-surface-card"
            >
              <code className="w-fit max-w-full truncate rounded bg-surface-card px-1.5 py-0.5 font-mono text-[10px] text-agency-brand group-hover:border group-hover:border-agency-brand-border">
                {v.token}
              </code>
              <span className="min-w-0">
                <span className="block font-sans text-[12px] font-medium text-fg">{v.label}</span>
                <span className="block break-words font-sans text-[10px] leading-snug text-fg-muted">
                  {v.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
