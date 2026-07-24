"use client";

import { CONTRACT_TEMPLATE_VARIABLES } from "@/lib/email/contract-template-variables";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   onInsert: (token: string) => void;
 *   activeField?: "subject" | "emailBodyMd" | "documentBodyMd";
 *   className?: string;
 * }} props
 */
export function ContractTemplateVariablesPicker({ onInsert, activeField, className }) {
  const filtered =
    activeField ?
      CONTRACT_TEMPLATE_VARIABLES.filter(
        (v) => !v.fields?.length || v.fields.includes(activeField),
      )
    : CONTRACT_TEMPLATE_VARIABLES;

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border-soft bg-surface-muted/40 p-3",
        className,
      )}
    >
      <p className="font-sans text-[11px] font-semibold text-fg">Tilgængelige variabler</p>
      <p className="mt-0.5 font-sans text-[10px] leading-snug text-fg-muted">
        Klik for at indsætte i det aktive felt
        {activeField === "subject" ?
          " (emne)"
        : activeField === "emailBodyMd" ?
          " (e-mail)"
        : activeField === "documentBodyMd" ?
          " (kontrakttekst)"
        : ""}
        .
      </p>
      <ul className="mt-2 flex max-h-[280px] flex-col gap-1.5 overflow-y-auto">
        {filtered.map((v) => (
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
