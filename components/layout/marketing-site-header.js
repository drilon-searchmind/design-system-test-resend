import Link from "next/link";

import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

import { SiteNav } from "./site-nav";

/** Tally-inspired floating pill nav (Hallmark N5) — marketing routes only */
export function MarketingSiteHeader() {
  return (
    <header
      className="pointer-events-none fixed top-[18px] left-0 right-0 z-50 flex justify-center px-4"
      role="banner"
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-[min(100%,52rem)] min-w-0 items-center gap-2 rounded-full border border-border bg-surface-glass py-1.5 pl-4 pr-2 backdrop-blur-xl sm:max-w-none sm:gap-3 sm:pl-5",
        )}
      >
        <Link
          href={routes.home}
          className="flex w-fit shrink-0 items-center gap-2 font-semibold tracking-tight text-fg hover:opacity-90"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0"
          >
            <rect x="3" y="3" width="6" height="18" rx="1.5" fill="currentColor" />
            <rect
              x="11"
              y="9"
              width="6"
              height="12"
              rx="1.5"
              fill="currentColor"
              opacity="0.55"
            />
            <rect x="19" y="14" width="3" height="7" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="text-sm sm:text-base">{site.name}</span>
        </Link>
        <SiteNav variant="tally" />
      </div>
    </header>
  );
}
