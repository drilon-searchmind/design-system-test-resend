"use client";

import { useMemo, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import {
  FEATURE_AREAS,
  FEATURE_STATUS_META,
  LAUNCH_GOALS,
  PLAN_ITEMS,
  PRIORITY_LABEL,
  PRODUCT_FEATURES,
  STATUS_LABEL,
  STATUS_LEGEND,
} from "@/lib/crm/feature-status-data";
import { cn } from "@/lib/utils";

/** @type {Record<string, string>} */
const STATUS_CARD = {
  done: "border-agency-ok-border/60 hover:border-agency-ok-border",
  partial: "border-agency-warn-border/60 hover:border-agency-warn-border",
  wip: "border-agency-brand-border/60 hover:border-agency-brand-border",
  missing: "border-border hover:border-border-muted",
};

/** @type {Record<string, string>} */
const STATUS_BADGE = {
  done: "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
  partial: "border-agency-warn-border bg-agency-warn-soft text-agency-warn",
  wip: "border-agency-brand-border bg-agency-brand-soft text-agency-brand",
  missing: "border-border bg-surface-muted text-fg-quiet",
};

/** @type {Record<string, string>} */
const STATUS_DOT = {
  done: "bg-agency-ok",
  partial: "bg-agency-warn",
  wip: "bg-agency-brand",
  missing: "bg-fg-quiet",
};

/** @param {{ status: string; className?: string }} props */
function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.05em]",
        STATUS_BADGE[status] ?? STATUS_BADGE.missing,
        className,
      )}
    >
      {STATUS_LABEL[/** @type {keyof typeof STATUS_LABEL} */ (status)] ?? status}
    </span>
  );
}

/** @param {{ percent: number }} props */
function ProgressBar({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full bg-agency-brand transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overblik" },
  { id: "features", label: "Features" },
  { id: "plan", label: "På vej" },
  { id: "launch", label: "Før launch" },
];

/** @param {{ feature: import('@/lib/crm/feature-status-data').ProductFeature }} props */
function FeatureDetailPanel({ feature }) {
  return (
    <div className="tally-panel p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-sans text-base font-semibold text-fg">{feature.title}</h3>
        <StatusBadge status={feature.status} />
      </div>
      <p className="mt-2 font-sans text-[13px] leading-relaxed text-fg-muted">{feature.description}</p>

      {feature.worksToday.length > 0 ?
        <div className="mt-5">
          <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-agency-ok">
            Det virker i dag
          </h4>
          <ul className="mt-2 space-y-1.5">
            {feature.worksToday.map((item) => (
              <li key={item} className="flex gap-2 font-sans text-[12px] text-fg-muted">
                <span className="text-agency-ok" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {feature.stillMissing && feature.stillMissing.length > 0 ?
        <div className="mt-5">
          <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-agency-warn">
            Mangler stadig
          </h4>
          <ul className="mt-2 space-y-1.5">
            {feature.stillMissing.map((item) => (
              <li key={item} className="flex gap-2 font-sans text-[12px] text-fg-muted">
                <span className="text-agency-warn" aria-hidden>
                  ○
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {feature.note ?
        <p className="mt-5 rounded-lg border border-border bg-surface-muted px-3 py-2.5 font-sans text-[12px] leading-relaxed text-fg-muted">
          {feature.note}
        </p>
      : null}

      {feature.owner ?
        <p className="mt-4 font-sans text-[11px] text-fg-quiet">
          Ansvarlig: <span className="font-medium text-fg-muted">{feature.owner}</span>
        </p>
      : null}
    </div>
  );
}

export function FeatureStatusClient() {
  const [tab, setTab] = useState("overview");
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));

  const counts = useMemo(() => {
    const c = { done: 0, partial: 0, wip: 0, missing: 0 };
    for (const f of PRODUCT_FEATURES) c[f.status] = (c[f.status] ?? 0) + 1;
    return c;
  }, []);

  const selected = useMemo(
    () => PRODUCT_FEATURES.find((f) => f.id === selectedId) ?? null,
    [selectedId],
  );

  const launchDone = LAUNCH_GOALS.filter((g) => g.done).length;

  return (
    <div>
      <div className="mb-6">
        <PulseSegmentedControl tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "overview" ?
        <div className="space-y-6">
          <div className="tally-panel p-5 md:p-6">
            <p className="font-sans text-[14px] leading-relaxed text-fg-muted">{FEATURE_STATUS_META.intro}</p>
            <div className="mt-5">
              <div className="flex items-end justify-between gap-3">
                <p className="font-sans text-sm font-semibold text-fg">Samlet fremskridt mod v1</p>
                <p className="font-mono text-xl font-semibold tabular-nums text-agency-brand">
                  ca. {FEATURE_STATUS_META.overallPercent}%
                </p>
              </div>
              <div className="mt-3">
                <ProgressBar percent={FEATURE_STATUS_META.overallPercent} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_LEGEND.map((s) => (
              <div key={s.id} className="tally-panel p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[s.id])} aria-hidden />
                  <p className="font-sans text-[13px] font-semibold text-fg">{s.label}</p>
                  <span className="ml-auto font-mono text-lg font-semibold tabular-nums text-fg-muted">
                    {counts[/** @type {keyof typeof counts} */ (s.id)] ?? 0}
                  </span>
                </div>
                <p className="mt-2 font-sans text-[12px] leading-snug text-fg-muted">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="tally-panel p-5">
            <h2 className="font-sans text-sm font-semibold text-fg">Hurtigt overblik</h2>
            <ul className="mt-3 space-y-2 font-sans text-[13px] text-fg-muted">
              <li>
                <span className="font-medium text-agency-ok">{counts.done} features</span> er klar til brug
              </li>
              <li>
                <span className="font-medium text-agency-warn">{counts.partial + counts.wip} features</span>{" "}
                virker delvist eller er under arbejde
              </li>
              <li>
                <span className="font-medium text-fg-quiet">{counts.missing} features</span> er ikke startet endnu
              </li>
              <li>
                <span className="font-medium text-fg">{PLAN_ITEMS.length} planlagte opgaver</span> i team-backlog
              </li>
              <li>
                <span className="font-medium text-fg">
                  {launchDone} af {LAUNCH_GOALS.length}
                </span>{" "}
                launch-krav er opfyldt
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setTab("features")}
              className="mt-4 rounded-full border border-agency-brand-border bg-agency-brand-soft px-4 py-2 font-sans text-[12px] font-medium text-agency-brand hover:opacity-90"
            >
              Se alle features →
            </button>
          </div>
        </div>
      : null}

      {tab === "features" ?
        <div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="space-y-8">
            {FEATURE_AREAS.map((area) => {
              const features = PRODUCT_FEATURES.filter((f) => f.area === area.id);
              if (!features.length) return null;
              return (
                <section key={area.id}>
                  <h2 className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                    {area.label}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {features.map((feature) => {
                      const isSelected = selectedId === feature.id;
                      return (
                        <button
                          key={feature.id}
                          type="button"
                          onClick={() => setSelectedId(feature.id)}
                          className={cn(
                            "tally-panel flex flex-col items-start gap-2 border p-4 text-left transition-colors",
                            STATUS_CARD[feature.status],
                            isSelected && "ring-2 ring-agency-brand/30",
                          )}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="font-sans text-[14px] font-semibold text-fg">{feature.title}</span>
                            <StatusBadge status={feature.status} />
                          </div>
                          <p className="font-sans text-[12px] leading-snug text-fg-muted">{feature.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
            {selected ?
              <FeatureDetailPanel feature={selected} />
            : <div className="tally-panel p-5">
                <p className="font-sans text-[13px] text-fg-muted">
                  Vælg en feature til venstre for at læse mere om hvad den kan, og hvad der mangler.
                </p>
              </div>}
          </aside>
          </div>

          {selected ?
            <div className="mt-4 lg:hidden">
              <FeatureDetailPanel feature={selected} />
            </div>
          : <p className="mt-4 font-sans text-[13px] text-fg-muted lg:hidden">
              Tryk på en feature for at læse mere.
            </p>}
        </div>
      : null}

      {tab === "plan" ?
        <div className="space-y-3">
          <p className="font-sans text-[13px] text-fg-muted">
            Det her er det teamet bygger som næste — fordelt på ansvarlige hvor det er aftalt.
          </p>
          {PLAN_ITEMS.map((item) => (
            <article key={item.id} className="tally-panel p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-sans text-[14px] font-semibold text-fg">{item.title}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-fg-muted">{item.description}</p>
              {item.note ?
                <p className="mt-3 font-sans text-[12px] text-fg-quiet">{item.note}</p>
              : null}
              {item.owner ?
                <p className="mt-3 font-sans text-[11px] text-fg-quiet">
                  Ansvarlig: <span className="font-medium text-fg-muted">{item.owner}</span>
                </p>
              : null}
            </article>
          ))}
        </div>
      : null}

      {tab === "launch" ?
        <div className="space-y-4">
          <div className="tally-panel p-4 md:p-5">
            <p className="font-sans text-[13px] text-fg-muted">
              Dette skal være på plads før vi kalder v1 færdig.{" "}
              <span className="font-medium text-fg">
                {launchDone} af {LAUNCH_GOALS.length}
              </span>{" "}
              er opfyldt.
            </p>
            <div className="mt-3">
              <ProgressBar percent={Math.round((launchDone / LAUNCH_GOALS.length) * 100)} />
            </div>
          </div>

          {["must", "should", "nice"].map((priority) => {
            const goals = LAUNCH_GOALS.filter((g) => g.priority === priority);
            if (!goals.length) return null;
            return (
              <section key={priority}>
                <h2 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
                  {PRIORITY_LABEL[priority]}
                </h2>
                <ul className="tally-panel divide-y divide-border-soft">
                  {goals.map((goal) => (
                    <li key={goal.id} className="flex items-start gap-3 px-4 py-3 md:px-5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold",
                          goal.done
                            ? "border-agency-ok-border bg-agency-ok-soft text-agency-ok"
                            : "border-border bg-surface-muted text-fg-quiet",
                        )}
                        aria-hidden
                      >
                        {goal.done ? "✓" : ""}
                      </span>
                      <p
                        className={cn(
                          "font-sans text-[13px] leading-snug",
                          goal.done ? "text-fg-muted line-through" : "text-fg",
                        )}
                      >
                        {goal.label}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      : null}
    </div>
  );
}
