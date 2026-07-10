"use client";

import { cn } from "@/lib/utils";

const SCOPE_DA = {
  retainer: "Retainer",
  project: "Projekt",
  any: "Alle typer",
};

/**
 * @param {string[]} keys
 * @param {Array<{ id: string; name?: string }>} team
 */
function formatAssigneeLabels(keys, team) {
  if (!keys.length) return "Ikke angivet";
  return keys.map((k) => team.find((m) => m.id === k)?.name ?? k).join(", ");
}

/**
 * @param {{
 *   templateWire: Record<string, unknown>;
 *   departments?: Array<{ id: string; name?: string; short?: string }>;
 *   team?: Array<{ id: string; name?: string }>;
 * }} props
 */
export function TemplateDetailOverview({ templateWire, departments = [], team = [] }) {
  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";

  const deptKey = typeof templateWire.dept === "string" ? templateWire.dept : "";
  const deptRow = departments.find((d) => d.id === deptKey);
  const deptLabel =
    (typeof deptRow?.name === "string" && deptRow.name.trim()) ||
    (typeof deptRow?.short === "string" && deptRow.short.trim()) ||
    deptKey ||
    "—";

  const scopeStr = typeof templateWire.scope === "string" ? templateWire.scope : "retainer";
  const scopeLabel = SCOPE_DA[scopeStr] ?? scopeStr;
  const active = templateWire.active !== false;
  const usedCount =
    typeof templateWire.usedCount === "number" && Number.isFinite(templateWire.usedCount) ? templateWire.usedCount : 0;

  const assigneeKeys = Array.isArray(templateWire.assigneeMemberKeys) ?
    templateWire.assigneeMemberKeys.map((k) => String(k).trim()).filter(Boolean)
  : [];
  const assigneeLabel = formatAssigneeLabels(assigneeKeys, team);
  const tidstypeLabel = templateWire.billable === false ? "Intern" : "Fakturerbar";

  return (
    <section aria-labelledby="template-overview" className={stack}>
      <h2 id="template-overview" className="sr-only">
        Overblik
      </h2>

      <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 lg:grid-cols-3">
        {[
          { k: "Disciplin", v: deptLabel },
          { k: "Kundetype", v: scopeLabel },
          { k: "Status", v: active ? "Aktiv" : "Arkiveret" },
          { k: "Ansvarlige", v: assigneeLabel },
          { k: "Tidstype", v: tidstypeLabel },
          { k: "Brugt i opgaver", v: `${usedCount}×` },
        ].map(({ k, v }) => (
          <div key={k} className={cn("tally-panel px-4 py-3")}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">{k}</div>
            <div className="mt-1 font-sans text-[14px] font-medium text-fg">{v}</div>
          </div>
        ))}
      </div>

      <p className="font-sans text-[13px] leading-relaxed text-fg-muted">
        Bruges ved <span className="font-medium text-fg-soft">Ny opgave</span> på Opgaver — forudfylder titel,
        disciplin, ansvarlige, tidstype, prioritet og deadline.
      </p>
    </section>
  );
}

/** @deprecated Brug TemplateDetailOverview — beholdes for import-kompatibilitet. */
export const TEMPLATE_DETAIL_TAB_IDS = /** @type {const} */ (["overblik"]);

/** @deprecated */
export function TemplateDetailTabbedBody(props) {
  return <TemplateDetailOverview {...props} />;
}
