"use client";

import { useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { ADMIN_RESOURCE_IDS, ADMIN_RESOURCE_TABS } from "@/lib/crm/admin-resource-meta";

import { AdminResourcePanel } from "./admin/admin-resource-panel";

export function SettingsAdminSection() {
  const [resourceId, setResourceId] = useState(ADMIN_RESOURCE_IDS[0]);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState(/** @type {string | null} */ (null));
  const [seedRefreshKey, setSeedRefreshKey] = useState(0);

  async function handleSeedTestData() {
    if (
      !window.confirm(
        "Opret testdata i databasen? Eksisterende rækker med isTest=true slettes først og oprettes på ny med relationer.",
      )
    ) {
      return;
    }
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/crm/seed-test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette testdata");
      setSeedMessage("Testdata oprettet — ét af hver type med isTest=true.");
      setSeedRefreshKey((k) => k + 1);
    } catch (e) {
      setSeedMessage(e instanceof Error ? e.message : "Fejl ved seed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-sans text-base font-semibold text-fg">Stamdata</h2>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            Opret og vedligehold masterdata i databasen. Brug <span className="font-medium text-fg">Kun test</span> for at se
            placeholder-rækker. Én test-<strong className="font-normal">opgave</strong> oprettes også (ikke i
            denne admin) med relationer til kunde, afdeling og team.
          </p>
        </div>
        <button
          type="button"
          disabled={seeding}
          onClick={() => void handleSeedTestData()}
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-surface-muted px-4 font-sans text-[12px] font-semibold text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand disabled:opacity-50"
        >
          {seeding ? "Opretter…" : "Opret testdata"}
        </button>
      </div>

      {seedMessage ? (
        <p
          className={
            seedMessage.startsWith("Testdata")
              ? "rounded-lg border border-agency-ok-border bg-agency-ok-soft px-3 py-2 font-sans text-[12px] text-agency-ok"
              : "rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad"
          }
        >
          {seedMessage}
        </p>
      ) : null}

      <PulseSegmentedControl
        size="sm"
        active={resourceId}
        onChange={setResourceId}
        tabs={ADMIN_RESOURCE_TABS}
        className="max-w-full"
      />

      <AdminResourcePanel key={`${resourceId}-${seedRefreshKey}`} resourceId={resourceId} />
    </div>
  );
}
