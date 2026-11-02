"use client";

import { useMemo, useState } from "react";

import { ClickUpSyncPreviewPanel } from "@/components/settings/clickup-sync-preview-panel";

const TASK_FIELD_LABELS = {
  name: "Titel",
  title: "Titel",
  status: "Status",
  priority: "Prioritet",
  clientName: "Kunde (Agency OS)",
  clientSlug: "Kunde",
  clientCvr: "CVR",
  customerFolder: "ClickUp-mappe",
  department: "Afdeling (Agency OS)",
  departmentKey: "Afdeling",
  serviceLine: "Service line (ClickUp)",
  serviceLineList: "ClickUp-liste",
  assignees: "Ansvarlige (matchet i teamet)",
  assigneeMemberKeys: "Ansvarlige",
  creator: "Oprettet af",
  dueDate: "Deadline",
  estimateHours: "Estimat",
  createdAt: "Oprettet i ClickUp",
  closedAt: "Afsluttet",
  isSubtask: "Delopgave",
  parentClickUpId: "Forælder",
  description: "Beskrivelse",
  notImported: "Findes i ClickUp, men importeres ikke endnu",
  blockers: "Blokeret",
  warnings: "Advarsler",
};

function defaultCreatedFrom() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultCreatedTo() {
  return new Date().toISOString().slice(0, 10);
}

export function ClickUpTasksPreviewPanel() {
  const initialFrom = useMemo(() => defaultCreatedFrom(), []);
  const initialTo = useMemo(() => defaultCreatedTo(), []);

  const [createdFrom, setCreatedFrom] = useState(initialFrom);
  const [createdTo, setCreatedTo] = useState(initialTo);
  const [limit, setLimit] = useState(100);

  return (
    <ClickUpSyncPreviewPanel
      title="Opgaver (Delivery)"
      description={
        <>
          Henter opgaver fra ClickUp&apos;s Delivery-struktur:{" "}
          <strong>[ZP] Delivery → kundemappe → service line → opgave</strong>. Interne mapper som{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">01-Searchmind</code> filtreres fra.
          Kunden kobles via mappenavn → kunde → CVR, ansvarlige via ClickUp-id/e-mail → team, og service line →
          afdeling. Findes kunden ikke i CRM&apos;et, men er i ClickUp&apos;s kunde-oversigt, oprettes den automatisk
          (som i kunde-sync) når opgaven importeres. Opgaver uden kunde i begge er blokeret. Importér valgte i bulk eller enkeltvis; en allerede
          importeret opgave opdateres i stedet for at blive dubleret.
        </>
      }
      previewPath="/api/settings/clickup/tasks/preview"
      applyPath="/api/settings/clickup/tasks/apply"
      showProposedDetails
      rowImportable
      getApplyRequestBody={() => ({ createdFrom, createdTo, limit })}
      applyBodyKey="clickUpTaskIds"
      entityLabel="opgave"
      entityLabelPlural="opgaver"
      fieldLabels={TASK_FIELD_LABELS}
      secondaryColumnLabel="Service line"
      secondaryColumnValue={(row) =>
        row.proposed?.serviceLine || row.proposed?.serviceLineList || "—"
      }
      rowLabel={(row) => row.proposed?.name || row.id || "—"}
      rowSubLabel={(row) => {
        const p = row.proposed;
        const client = p?.clientName || p?.customerFolder;
        const parts = [
          client ? `${client}${p?.clientCvr ? ` (CVR ${p.clientCvr})` : ""}` : "",
          p?.assignees || "",
          p?.createdAt || "",
          p?.blockers ? "⛔ blokeret" : p?.warnings ? "⚠ advarsel" : "",
        ].filter(Boolean);
        return parts.length ? parts.join(" · ") : null;
      }}
      getPreviewRequestBody={() => ({
        createdFrom,
        createdTo,
        limit,
      })}
      renderPreviewControls={
        <div className="flex w-full min-w-[min(100%,18rem)] flex-col gap-2 rounded-xl border border-border bg-surface-muted/40 p-3 sm:w-auto">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-[11px] font-medium text-fg-muted">
              Oprettet fra
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="h-9 rounded-lg border border-border bg-canvas px-2.5 font-sans text-[12px] text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 font-sans text-[11px] font-medium text-fg-muted">
              Oprettet til
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="h-9 rounded-lg border border-border bg-canvas px-2.5 font-sans text-[12px] text-fg"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-sans text-[11px] font-medium text-fg-muted">
            Antal opgaver (max 500)
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setLimit(Number.isFinite(n) ? Math.max(1, Math.min(n, 500)) : 100);
              }}
              className="h-9 w-full rounded-lg border border-border bg-canvas px-2.5 font-sans text-[12px] text-fg sm:w-28"
            />
          </label>
        </div>
      }
      renderMeta={(preview) => (
        <div className="flex flex-col gap-1 font-sans text-[11px] text-fg-quiet">
          {typeof preview.spaceName === "string" ?
            <span>
              Space: {preview.spaceName}
              {typeof preview.spaceId === "string" ? ` (${preview.spaceId})` : ""}
            </span>
          : null}
          {typeof preview.createdFrom === "string" || typeof preview.createdTo === "string" ?
            <span>
              Periode: {preview.createdFrom ?? "…"} → {preview.createdTo ?? "…"}
            </span>
          : null}
          {typeof preview.matchedCount === "number" && typeof preview.limit === "number" ?
            <span>
              Viser {preview.matchedCount} opgaver (limit {preview.limit})
              {typeof preview.matchedBeforeLimit === "number" &&
              preview.matchedBeforeLimit > preview.matchedCount ?
                ` · ${preview.matchedBeforeLimit} matchede i perioden`
              : ""}
              {typeof preview.scannedCount === "number" ? ` · ${preview.scannedCount} scannet i ClickUp` : ""}
            </span>
          : null}
        </div>
      )}
    />
  );
}
