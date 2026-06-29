"use client";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { TemplateDetailMongoPanel } from "@/components/templates/template-detail-mongo-panel";
import { cn } from "@/lib/utils";

export const TEMPLATE_DETAIL_TAB_IDS = /** @type {const} */ (["overblik", "tjekliste", "aktivitet", "crm"]);

const TAB_DEFS = [
  { id: "overblik", label: "Overblik" },
  { id: "tjekliste", label: "Tjekliste" },
  { id: "aktivitet", label: "Aktivitet" },
  { id: "crm", label: "CRM" },
];

/**
 * @param {{
 *   tab: string;
 *   onTabChange: (id: string) => void;
 *   templateWire: Record<string, unknown>;
 *   activityEntries: Array<{ id: string; at: string; kind: string; summary: string }>;
 *   checklistDemoNote?: boolean;
 *   activityFootnote?: string;
 *   mongo?: {
 *     templateRouteId: string;
 *     departments: Array<{ id: string; name?: string }>;
 *     busy?: boolean;
 *     notice?: string | null;
 *     onBusyChange?: (b: boolean) => void;
 *     onNotice?: (s: string | null) => void;
 *     onReload: () => void | Promise<void>;
 *   } | null;
 * }} props
 */
export function TemplateDetailTabbedBody({
  tab,
  onTabChange,
  templateWire,
  activityEntries,
  checklistDemoNote = false,
  activityFootnote,
  mongo = null,
}) {
  /** @type {(typeof TEMPLATE_DETAIL_TAB_IDS)[number]} */
  const resolvedTab =
    TEMPLATE_DETAIL_TAB_IDS.includes(/** @type {(typeof TEMPLATE_DETAIL_TAB_IDS)[number]} */ (tab)) ?
      /** @type {(typeof TEMPLATE_DETAIL_TAB_IDS)[number]} */ (tab)
    : "overblik";

  const stack = "flex flex-col gap-[length:var(--ds-studio-stack)]";

  /** @type {string[]} */
  const checklist = Array.isArray(templateWire.checklist) ? templateWire.checklist.map((x) => String(x)) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Sektion</p>
        <nav aria-label="Skabelon-undersektioner">
          <PulseSegmentedControl size="sm" active={resolvedTab} onChange={onTabChange} tabs={TAB_DEFS} />
        </nav>
      </div>

      <div role="tabpanel" className="min-w-0">
        {resolvedTab === "overblik" ?
          <section aria-labelledby="template-tab-overview" className={stack}>
            <h2 id="template-tab-overview" className="sr-only">
              Overblik
            </h2>

            <div className="grid gap-[length:var(--ds-studio-stack)] sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "Nøgle", v: typeof templateWire.id === "string" ? templateWire.id : "—" },
                {
                  k: "Disciplin (key)",
                  v: typeof templateWire.dept === "string" && templateWire.dept ? templateWire.dept : "—",
                },
                {
                  k: "Scope",
                  v: typeof templateWire.scope === "string" ? templateWire.scope : "—",
                },
                {
                  k: "Biblioteksstatus",
                  v: templateWire.active === false ? "Arkiveret" : "Aktiv",
                },
              ].map(({ k, v }) => (
                <div
                  key={k}
                  className={cn("tally-panel px-4 py-3")}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">{k}</div>
                  <div className="mt-1 font-sans text-[14px] font-medium tabular-nums text-fg">{v}</div>
                </div>
              ))}
            </div>

            <div className="tally-panel p-4 md:p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                Leverance-definition
              </h3>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-fg-muted">
                Skabelonen provisionerer standardfelter ved nye opgaver og spejler den dokumenterede struktur på listen
                (bibliotek) samt CRM-post på CRM-fanen.
              </p>
            </div>
          </section>
        : null}

        {resolvedTab === "tjekliste" ?
          <section aria-labelledby="template-tab-checklist" className={stack}>
            <h2 id="template-tab-checklist" className="sr-only">
              Tjekliste
            </h2>
            <div className="tally-panel p-4 md:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Punkter</p>
                {checklistDemoNote && !checklist.length ?
                  <p className="font-sans text-[11px] text-fg-quiet">
                    Kun antalsfelt registreret (
                    <span className="tabular-nums">{String(templateWire.checklistCount ?? 0)}</span>).
                  </p>
                : null}
              </div>

              {!checklist.length ?
                <p className="mt-4 font-sans text-[13px] text-fg-muted">
                  {checklistDemoNote ?
                    `Ingen enkeltpunkter — kun tæller (${String(templateWire.checklistCount ?? 0)} stk.).`
                  : "Ingen tjekliste endnu."}
                </p>
              : (
                <ol className="mt-4 list-decimal space-y-2 ps-6 font-sans text-[13px] text-fg">
                  {checklist.map((line, ix) => (
                    <li key={`${line}-${String(ix)}`} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        : null}

        {resolvedTab === "aktivitet" ?
          <section aria-labelledby="template-tab-spor" className={stack}>
            <h2 id="template-tab-spor" className="sr-only">
              Aktivitet
            </h2>

            {!activityEntries.length ?
              <p className="font-sans text-[13px] text-fg-muted">Ingen aktivitetslinjer registreret endnu.</p>
            : (
              <ul className="space-y-2 font-sans text-[13px]">
                {activityEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-border-soft bg-surface-muted/40 px-4 py-3 leading-snug text-fg"
                  >
                    <span className="text-[11px] text-fg-quiet">{e.at}</span>
                    <span className="mx-2 text-fg-quiet">·</span>
                    <span className="font-semibold text-fg-soft">{e.kind}</span>
                    <span className="mx-2 text-fg-quiet">—</span>
                    {e.summary}
                  </li>
                ))}
              </ul>
            )}

            {activityFootnote ?
              <p className="font-sans text-[11px] text-fg-quiet">{activityFootnote}</p>
            : null}
          </section>
        : null}

        {resolvedTab === "crm" ?
          <section aria-labelledby="template-tab-crm" className={stack}>
            <h2 id="template-tab-crm" className="sr-only">
              CRM
            </h2>
            {mongo ?
              <TemplateDetailMongoPanel
                templateRouteId={mongo.templateRouteId}
                wire={templateWire}
                departments={mongo.departments}
                busy={mongo.busy}
                notice={mongo.notice}
                onBusyChange={mongo.onBusyChange}
                onNotice={mongo.onNotice}
                onReload={mongo.onReload}
              />
            : (
              <p className="tally-panel px-4 py-3 text-[13px] text-fg-muted">
                CRM-redigering er ikke tilgængelig i denne visning.
              </p>
            )}
          </section>
        : null}
      </div>
    </div>
  );
}
