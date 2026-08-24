import Link from "next/link";

import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

import { BRAND_LOGO_SIZE, BrandLogo } from "./brand-logo";
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
          <BrandLogo size={BRAND_LOGO_SIZE.nav} />
          <span className="text-sm sm:text-base">{site.name}</span>
        </Link>
        <SiteNav variant="tally" />
      </div>
    </header>
  );
}
