"use client";

import { DataSourcePreference } from "@/components/settings/data-source-preference";
import { SettingsAdminSection } from "@/components/settings/settings-admin-section";
import { tallyEyebrow } from "@/lib/ui/tally-chrome";

export function SettingsWorkspace() {
  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-border pb-6">
        <p className={tallyEyebrow}>◇ settings</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em] text-fg">
          Indstillinger
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          Vælg hvordan dashboards og moduler henter data — fra den tilsluttede database eller den indbyggede
          eksempelpakke.
        </p>
      </header>

      <DataSourcePreference />

      <SettingsAdminSection />
    </div>
  );
}
