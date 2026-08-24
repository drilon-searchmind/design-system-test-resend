"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { DataSourcePreference } from "@/components/settings/data-source-preference";
import { SettingsAdminSection } from "@/components/settings/settings-admin-section";
import { SettingsClickUpSyncSection } from "@/components/settings/settings-clickup-sync-section";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { tallyEyebrow } from "@/lib/ui/tally-chrome";

const SETTINGS_TABS = [
  { id: "general", label: "Generelt" },
  { id: "clickup", label: "ClickUp sync" },
];

export function SettingsWorkspace() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const [tab, setTab] = useState("general");

  const visibleTabs = isAdmin ? SETTINGS_TABS : SETTINGS_TABS.filter((t) => t.id === "general");

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

      {visibleTabs.length > 1 ?
        <PulseSegmentedControl active={tab} onChange={setTab} tabs={visibleTabs} className="max-w-md" />
      : null}

      {tab === "clickup" && isAdmin ?
        <SettingsClickUpSyncSection />
      : <>
          <DataSourcePreference />
          <SettingsAdminSection />
        </>
      }
    </div>
  );
}
