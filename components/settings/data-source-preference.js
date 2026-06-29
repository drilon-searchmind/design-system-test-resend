"use client";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { setDataSource, useDataSource } from "@/components/crm/use-data-source";
import { cn } from "@/lib/utils";

export function DataSourcePreference() {
  const mode = useDataSource();

  return (
    <section className="tally-panel p-5 md:p-6">
      <h2 className="font-sans text-base font-semibold text-fg">Visning</h2>
      <p className="mt-2 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
        Vælg om dashboards og moduler læser fra{" "}
        <span className="font-medium text-fg">database</span> eller fra den indbyggede{" "}
        <span className="font-medium text-fg">eksempelpakke</span>. Valget gemmes i browseren på denne
        enhed.
      </p>
      <div className="mt-4">
        <PulseSegmentedControl
          size="sm"
          active={mode}
          onChange={(id) => setDataSource(id === "database" ? "database" : "demo")}
          tabs={[
            { id: "demo", label: "Eksempeldata" },
            { id: "database", label: "Database" },
          ]}
        />
      </div>
      <p
        className={cn(
          "mt-3 font-sans text-[12px]",
          mode === "database" ? "text-agency-ok" : "text-fg-quiet",
        )}
      >
        {mode === "database"
          ? "Aktiv: data fra database."
          : "Aktiv: eksempeldata."}
      </p>
    </section>
  );
}
