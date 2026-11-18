import { IconClock } from "@/components/crm/icons";
import { tallyBtnGhost, tallyEyebrow } from "@/lib/ui/tally-chrome";
import { cn } from "@/lib/utils";

/**
 * @param {{ onClose?: (() => void) | null; closeLabel?: string }} props
 */
export function TimeTrackPageHeader({ onClose = null, closeLabel = "Luk" }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 md:flex-1">
          <p className={cn(tallyEyebrow, "flex items-center gap-2")}>
            <IconClock size={14} className="text-accent" aria-hidden />
            ◇ timer · manuel log · kunde & opgave
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-fg">
            Timer
          </h1>
        </div>
        {onClose ? (
          <div className="flex shrink-0 md:justify-end md:pt-1">
            <button type="button" onClick={onClose} className={tallyBtnGhost}>
              {closeLabel}
            </button>
          </div>
        ) : null}
      </header>
    </div>
  );
}
