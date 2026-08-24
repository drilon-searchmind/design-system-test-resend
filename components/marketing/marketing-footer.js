import Link from "next/link";

import { BRAND_LOGO_SIZE, BrandLogo } from "@/components/layout/brand-logo";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className={cn("mt-auto border-t border-border-muted py-12", shellPaddingX)}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 sm:flex-row sm:justify-between sm:gap-4">
        <div className="flex max-w-md flex-col items-center gap-3 sm:items-start">
          <Link href={routes.home} className="flex items-center gap-2.5 hover:opacity-90">
            <BrandLogo size={BRAND_LOGO_SIZE.nav} />
            <span className="text-sm font-semibold tracking-tight text-fg">{site.name}</span>
          </Link>
          <p className="text-center text-sm leading-relaxed text-fg-muted sm:text-left">
            {site.branding} is Searchmind&apos;s operational cockpit — SSO,
            workspaces, settings, and integrations behind one interface.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-fg-muted"
          aria-label="Footer links"
        >
          <Link
            className="rounded-full px-2 py-1 transition hover:text-fg"
            href={routes.privacy}
          >
            Privacy
          </Link>
          <Link
            className="rounded-full px-2 py-1 transition hover:text-fg"
            href={routes.terms}
          >
            Terms
          </Link>
          <span className="text-xs text-fg-soft">
            © {year}
          </span>
        </nav>
      </div>
    </footer>
  );
}
