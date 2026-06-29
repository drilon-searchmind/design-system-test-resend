import { shellMainStudio } from "@/config/shell";
import { tallyEyebrow } from "@/lib/ui/tally-chrome";
import { cn } from "@/lib/utils";

/**
 * @param {{ title: string; description?: string; className?: string; children?: import('react').ReactNode }} props
 */
export function WorkspacePlaceholder({ title, description, className, children }) {
  return (
    <main className={cn(shellMainStudio, className)}>
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <p className={tallyEyebrow}>◇ workspace</p>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-fg md:text-2xl">{title}</h2>
        {description ? (
          <p className="max-w-prose text-sm text-fg-muted">{description}</p>
        ) : null}
      </header>
      {children ? <section className="text-sm text-fg-muted">{children}</section> : null}
    </main>
  );
}
