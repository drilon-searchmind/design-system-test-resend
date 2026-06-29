import { MarketingSiteHeader } from "@/components/layout/marketing-site-header";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

export default function AuthLayout({ children }) {
  return (
    <div
      data-surface="marketing-tally"
      className="flex min-h-0 flex-1 flex-col text-fg"
    >
      <MarketingSiteHeader />
      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center py-16 pt-32 sm:pt-36",
          shellPaddingX,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--tally-ink-0) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--tally-ink-0) 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 70% 55% at 50% 40%, black 25%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 40%, black 25%, transparent 72%)",
          }}
        />
        <div className="relative w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
