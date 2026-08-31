import Link from "next/link";

import { BrandLogoMark } from "@/components/layout/brand-logo";
import { FeatureStatusClient } from "@/components/status/feature-status-client";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { FEATURE_STATUS_META } from "@/lib/crm/feature-status-data";

export function FeatureStatusView() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-border bg-canvas/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href={routes.home} className="flex items-center gap-2.5 text-fg hover:opacity-90">
            <BrandLogoMark />
            <span className="font-sans text-sm font-semibold tracking-tight">{site.branding}</span>
          </Link>
          <Link
            href={routes.login}
            className="rounded-full border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5 font-sans text-[12px] font-medium text-agency-brand hover:opacity-90"
          >
            Log ind
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6">
          <h1 className="font-sans text-[26px] font-semibold tracking-tight text-fg md:text-[30px]">
            {FEATURE_STATUS_META.title}
          </h1>
          <p className="mt-1 font-sans text-[14px] text-fg-muted">
            {FEATURE_STATUS_META.subtitle} · Opdateret {FEATURE_STATUS_META.updatedAt}
          </p>
        </div>

        <FeatureStatusClient />

        <footer className="mt-10 border-t border-border pt-5 font-sans text-[11px] text-fg-quiet">
          Offentlig side — du behøver ikke logge ind for at læse den.
        </footer>
      </main>
    </div>
  );
}
