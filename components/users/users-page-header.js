"use client";

import { IconShield } from "@/components/crm/icons";
import { PulseIconDownload } from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TEAM } from "@/lib/crm/static-data";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import { useState } from "react";

/**
 * @param {{
 *   dataSource?: "demo" | "database";
 *   mineLabel?: string | null;
 *   loading?: boolean;
 * }} props
 */
export function UsersPageHeader({
  dataSource = "demo",
  mineLabel = null,
  loading = false,
}) {
  const [view, setView] = useState("all");
  const demoName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";
  const displayName =
    typeof mineLabel === "string" && mineLabel.trim() ?
      mineLabel.trim()
    : dataSource === "demo" ?
      demoName
    : "—";

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconShield size={14} className="text-agency-brand" aria-hidden />
            Adgang & invitationskø
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">Brugerstyring</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            Din række markeres ud fra roster:{" "}
            <span className="font-semibold text-fg">{loading ? "\u2026" : displayName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PulseSegmentedControl
            size="sm"
            active={view}
            onChange={setView}
            tabs={[
              { id: "all", label: "Alle konti" },
              { id: "security", label: "Sikkerhed" },
            ]}
          />
          <button
            type="button"
            disabled
            className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 font-sans text-[11px] font-medium text-fg-muted opacity-60"
            title="Kommer snart"
          >
            <PulseIconDownload size={12} /> Audit log
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-[26px] items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[11px] font-medium text-agency-brand opacity-70"
          >
            Inviter bruger
          </button>
        </div>
      </header>

      {view !== "all" ? (
        <p className="rounded-xl border border-border-soft bg-surface-muted/50 px-3 py-2.5 font-sans text-[12px] leading-snug text-fg-muted">
          <span className="font-medium text-fg">Sikkerhedsvisning</span> — policy-tjek og MFA-drift i fuld Agency OS;
          denne visning viser ingen ekstra kolonner endnu.
        </p>
      ) : null}
    </div>
  );
}
