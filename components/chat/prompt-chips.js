import { cn } from "@/lib/utils";
import { promptSuggestions } from "@/lib/demo/chat-scenarios";

/**
 * @param {{ onSelect: (feedId: string, label: string) => void; className?: string }} props
 */
export function PromptChips({ onSelect, className }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
        Prøv at spørge om…
      </p>
      <div className="flex flex-wrap gap-2">
        {promptSuggestions.map((s) => (
          <button
            key={s.feedId}
            type="button"
            onClick={() => onSelect(s.feedId, s.label)}
            className={cn(
              "rounded-full border border-border bg-surface-card px-3 py-1.5",
              "font-sans text-[12.5px] text-fg-muted shadow-inset-card",
              "hover:border-solid-cta-bg hover:bg-solid-cta-bg/10 hover:text-fg",
              "transition-colors",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
