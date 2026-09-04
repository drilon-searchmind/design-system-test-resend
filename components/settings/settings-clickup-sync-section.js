"use client";

import { useState } from "react";

import { ClickUpSyncPreviewPanel } from "@/components/settings/clickup-sync-preview-panel";
import { ClickUpTasksPreviewPanel } from "@/components/settings/clickup-tasks-preview-panel";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";

const CUSTOMER_FIELD_LABELS = {
  name: "Navn",
  slug: "Slug",
  status: "Status",
  cvr: "CVR",
  retainerAmount: "Retainer",
  marketingStartMrr: "Start MRR",
  marketingUpsellMrr: "Opsalg MRR",
  agreementType: "Aftaletype",
  industry: "Branche",
  leadSource: "Leadkilde",
  googleDriveUrl: "Google Drive",
  clickUpTaskName: "ClickUp-navn",
  churnNote: "Opsigelsesnote",
  annualAdjustmentPct: "Prisregulering",
  servicesActive: "Services",
  churnReason: "Opsigelsesgrund",
  startedAt: "Startdato",
  renewalAt: "Fornyelse",
  terminatedAt: "Opsagt",
};

const USER_FIELD_LABELS = {
  name: "Navn",
  email: "Email",
  teamMemberKey: "TeamMember-nøgle",
  avatarInitials: "Initialer",
  hue: "Hue",
  weeklyHours: "Ugentlige timer",
  active: "Aktiv",
  accessTier: "Adgangsniveau",
  image: "Profilbillede",
};

const KNOWLEDGE_FIELD_LABELS = {
  title: "Titel",
  slug: "Slug",
  sectionId: "Sektion",
  summary: "Resumé",
  bodyLength: "Brødtekst (tegn)",
  parentSlug: "Forælder",
  sortOrder: "Sortering",
  published: "Publiceret",
  featured: "Fremhævet",
  readingMinutes: "Læsetid",
};

const DISCIPLINE_FIELD_LABELS = {
  name: "Navn",
  primaryDept: "Primær disciplin",
  disciplineKeys: "Discipliner",
};

/** @typedef {'customers' | 'users' | 'knowledge' | 'disciplines' | 'tasks'} ClickUpSyncTab */

export function SettingsClickUpSyncSection() {
  const [tab, setTab] = useState(/** @type {ClickUpSyncTab} */ ("customers"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-sans text-base font-semibold text-fg">ClickUp sync</h2>
        <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
          Synkroniser data fra ClickUp (og relaterede kilder) med preview og godkendelse før import.
          Vælg en fane for den sync du vil køre.
        </p>
      </div>

      <PulseSegmentedControl
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "customers", label: "Kunder" },
          { id: "users", label: "Brugere" },
          { id: "knowledge", label: "Vidensbase" },
          { id: "disciplines", label: "Discipliner" },
          { id: "tasks", label: "Opgaver" },
        ]}
      />

      {tab === "customers" ?
        <ClickUpSyncPreviewPanel
          title="Kunder / klienter"
          description={
            <>
              Hent kunder fra ClickUp Account Dashboard. Svarer til{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">fetch-clickup-customers</code> +{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">import-clickup-customers-api</code>.
            </>
          }
          previewPath="/api/settings/clickup/customers/preview"
          applyPath="/api/settings/clickup/customers/apply"
          applyBodyKey="customerClickUpIds"
          entityLabel="kunde"
          fieldLabels={CUSTOMER_FIELD_LABELS}
          secondaryColumnLabel="Status"
          secondaryColumnValue={(row) => row.proposed?.status || row.current?.status || "—"}
          rowSubLabel={(row) => row.proposed?.slug || row.current?.slug || null}
          confirmApply={(count) =>
            `Importer ${count} kunde${count === 1 ? "" : "r"} fra ClickUp til databasen? Eksisterende kunder opdateres.`
          }
          renderMeta={(preview) =>
            typeof preview.viewId === "string" ?
              <p className="font-sans text-[11px] text-fg-quiet">ClickUp view {preview.viewId}</p>
            : null
          }
        />
      : null}

      {tab === "users" ?
        <ClickUpSyncPreviewPanel
          title="Brugere / teammedlemmer"
          description={
            <>
              Hent brugere fra ClickUp-listen. Svarer til{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">fetch-clickup-users</code> +{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">import-clickup-users-api</code>.
              Eksisterende teamMemberKey bevares ved opdatering.
            </>
          }
          previewPath="/api/settings/clickup/users/preview"
          applyPath="/api/settings/clickup/users/apply"
          applyBodyKey="clickUpMemberIds"
          entityLabel="bruger"
          fieldLabels={USER_FIELD_LABELS}
          secondaryColumnLabel="Email"
          secondaryColumnValue={(row) => row.proposed?.email || row.current?.email || "—"}
          rowSubLabel={(row) => row.proposed?.teamMemberKey || row.current?.teamMemberKey || null}
          confirmApply={(count) =>
            `Importer ${count} bruger${count === 1 ? "" : "e"} fra ClickUp? Eksisterende brugere opdateres.`
          }
          renderMeta={(preview) =>
            typeof preview.listId === "string" ?
              <p className="font-sans text-[11px] text-fg-quiet">ClickUp list {preview.listId}</p>
            : null
          }
        />
      : null}

      {tab === "knowledge" ?
        <ClickUpSyncPreviewPanel
          title="Vidensbase"
          description={
            <>
              Hent wiki-sider fra ClickUp Knowledge Base. Svarer til{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">fetch-clickup-knowledge</code> +
              import af valgte artikler (uden masse-sletning af eksisterende).
            </>
          }
          previewPath="/api/settings/clickup/knowledge/preview"
          applyPath="/api/settings/clickup/knowledge/apply"
          applyBodyKey="clickupPageIds"
          entityLabel="artikel"
          entityLabelPlural="artikler"
          fieldLabels={KNOWLEDGE_FIELD_LABELS}
          secondaryColumnLabel="Sektion"
          secondaryColumnValue={(row) => row.proposed?.sectionId || row.current?.sectionId || "—"}
          rowLabel={(row) => row.proposed?.title || row.current?.title || row.id || "—"}
          rowSubLabel={(row) => row.proposed?.slug || row.current?.slug || null}
          confirmApply={(count) =>
            `Importer ${count} artikel${count === 1 ? "" : "er"} fra ClickUp vidensbase? Eksisterende artikler opdateres.`
          }
          renderMeta={(preview) => (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-[11px] text-fg-quiet">
              {typeof preview.sourceLabel === "string" ?
                <span>{preview.sourceLabel}</span>
              : null}
              {typeof preview.importable === "number" ?
                <span>{preview.importable} importérbare · {preview.excluded ?? 0} ekskluderet</span>
              : null}
            </div>
          )}
        />
      : null}

      {tab === "disciplines" ?
        <ClickUpSyncPreviewPanel
          title="Discipliner"
          description={
            <>
              Afleder TeamMember.disciplineKeys fra klienters deptAssignees. Svarer til{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">sync-member-disciplines</code>.
              Henter ikke direkte fra ClickUp API.
            </>
          }
          previewPath="/api/settings/clickup/disciplines/preview"
          applyPath="/api/settings/clickup/disciplines/apply"
          applyBodyKey="memberKeys"
          entityLabel="medlem"
          entityLabelPlural="medlemmer"
          fieldLabels={DISCIPLINE_FIELD_LABELS}
          secondaryColumnLabel="Primær disciplin"
          secondaryColumnValue={(row) => row.proposed?.primaryDept || row.current?.primaryDept || "—"}
          rowSubLabel={(row) => row.proposed?.disciplineKeys || row.current?.disciplineKeys || null}
          selectableKinds={["update"]}
          confirmApply={(count) =>
            `Opdater discipliner for ${count} teammedlem${count === 1 ? "" : "mer"} baseret på klient-tildelinger?`
          }
          renderMeta={(preview) => (
            <div className="flex flex-col gap-2">
              <p className="font-sans text-[11px] text-fg-quiet">
                {preview.clientsScanned ?? 0} klienter scannet · {preview.total ?? 0} aktive medlemmer ·{" "}
                {preview.counts?.unchanged ?? 0} uændrede
              </p>
              {Array.isArray(preview.unmatchedAssigneeNames) && preview.unmatchedAssigneeNames.length ?
                <p className="rounded-lg border border-agency-warn-border bg-agency-warn-soft px-3 py-2 font-sans text-[11px] text-agency-warn">
                  {preview.unmatchedAssigneeCount ?? preview.unmatchedAssigneeNames.length} assignee-navne kunne
                  ikke matches: {preview.unmatchedAssigneeNames.slice(0, 8).join(", ")}
                  {(preview.unmatchedAssigneeCount ?? 0) > 8 ? " …" : ""}
                </p>
              : null}
            </div>
          )}
        />
      : null}

      {tab === "tasks" ? <ClickUpTasksPreviewPanel /> : null}
    </div>
  );
}
