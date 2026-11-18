"use client";

import { useEffect, useState } from "react";

import { tovBtn } from "@/components/tov/tov-ui";
import { cn } from "@/lib/utils";

/** @param {number} sec */
function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} sek`;
}

/**
 * Soft asymptotic progress — Claude does not stream real %.
 * @param {number} elapsedSec
 * @param {number} [halfLife=40]
 * @param {number} [cap=94]
 */
function softProgress(elapsedSec, halfLife = 40, cap = 94) {
  return Math.min(cap, Math.round(cap * (1 - Math.exp(-elapsedSec / halfLife))));
}

/**
 * @param {{
 *   title: string;
 *   stages: Array<{ from: number; label: string; detail: string }>;
 *   startedAt?: string | null;
 *   footer?: string;
 *   cancelLabel?: string;
 *   cancelling?: boolean;
 *   onCancel?: () => void;
 * }} props
 */
export function TovProgressCard({ title, stages, startedAt = null, footer, cancelLabel, cancelling, onCancel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(id);
  }, []);

  const startMs = startedAt ? Date.parse(startedAt) : now;
  const elapsed = Math.max(0, Math.floor((now - (Number.isNaN(startMs) ? now : startMs)) / 1000));
  const pct = softProgress(elapsed);
  let stageIndex = 0;
  for (const [i, s] of stages.entries()) if (elapsed >= s.from) stageIndex = i;
  const stage = stages[stageIndex] ?? stages[0];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-agency-brand-border bg-agency-brand-soft/50 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1" aria-hidden>
              <span className="tov-progress-dot size-1.5 rounded-full bg-agency-brand" />
              <span className="tov-progress-dot size-1.5 rounded-full bg-agency-brand" />
              <span className="tov-progress-dot size-1.5 rounded-full bg-agency-brand" />
            </span>
            <p className="font-sans text-[13px] font-semibold text-agency-brand">{title}</p>
          </div>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">
            {stage.label} · {formatElapsed(elapsed)}
          </p>
        </div>
        {onCancel ?
          <button type="button" className={tovBtn} onClick={onCancel} disabled={cancelling}>
            {cancelling ? "Afbryder…" : (cancelLabel ?? "Afbryd")}
          </button>
        : null}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between font-sans text-[11px] text-fg-soft">
          <span>Fremskridt</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${title} (estimeret)`}
        >
          <div
            className="tov-progress-fill h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
        <p className="mt-2 font-sans text-[12px] text-fg-muted">{stage.detail}</p>
      </div>

      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {stages.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "flex items-center gap-1.5 font-sans text-[11px]",
              i < stageIndex ? "text-agency-ok" : i === stageIndex ? "text-agency-brand" : "text-fg-quiet",
            )}
          >
            <span aria-hidden>{i < stageIndex ? "✓" : i === stageIndex ? "●" : "○"}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {footer ? <p className="mt-3 font-sans text-[11px] leading-snug text-fg-quiet">{footer}</p> : null}
    </div>
  );
}

const ANALYZE_STAGES = [
  { from: 0, label: "Samler materiale", detail: "PDF'er, tekster, billeder og websider forberedes." },
  { from: 8, label: "Sender til Claude", detail: "Materialet sendes til den valgte model." },
  { from: 18, label: "Analyserer stemme og tone", detail: "Personlighed, tiltaleform og ordvalg." },
  { from: 40, label: "Udtrækker typografi og farver", detail: "Fonte, størrelser, vægte og palette." },
  { from: 65, label: "Samler eksempler og budskaber", detail: "Gode/dårlige eksempler og kanalregler." },
  { from: 85, label: "Strukturerer JSON-profilen", detail: "Validerer mod det standardiserede skema." },
];

const PREVIEW_STAGES = [
  { from: 0, label: "Læser Brand Core-profilen", detail: "Typografi, farver og stemme hentes ind." },
  { from: 10, label: "Skriver brand essens", detail: "Essens, historie og kerneværdier." },
  { from: 30, label: "Formulerer tone of voice-principper", detail: "Principper med gør/undgå-eksempler." },
  { from: 55, label: "Skriver budskaber", detail: "Eksempler i kundens tone og sprog." },
  { from: 80, label: "Opsætter dokumentet", detail: "Næsten færdig — forside, farver og typografi sættes op og gemmes." },
];

const REWRITE_STAGES = [
  { from: 0, label: "Læser din tekst", detail: "Indholdet forberedes til omskrivning." },
  { from: 8, label: "Matcher kundens tone", detail: "Personlighed, tiltaleform og ordvalg." },
  { from: 35, label: "Omskriver", detail: "Teksten tilpasses kundens tone of voice." },
  { from: 70, label: "Finpudser", detail: "Tjekker længde, klarhed og stil." },
];

/**
 * @param {{
 *   startedAt: string | null;
 *   modelLabel?: string;
 *   sourceCount?: number;
 *   cancelling?: boolean;
 *   onCancel: () => void;
 * }} props
 */
export function TovAnalysisProgress({ startedAt, modelLabel = "", sourceCount = 0, cancelling, onCancel }) {
  const bits = [
    modelLabel,
    sourceCount ? `${sourceCount} ${sourceCount === 1 ? "kilde" : "kilder"}` : "",
    "typisk 1–3 min",
  ].filter(Boolean);
  return (
    <TovProgressCard
      title="Analyserer Brand Core"
      stages={ANALYZE_STAGES}
      startedAt={startedAt}
      cancelLabel="Afbryd analyse"
      cancelling={cancelling}
      onCancel={onCancel}
      footer={`${bits.join(" · ")}. Materiale er låst mens analysen kører — du kan forlade siden.`}
    />
  );
}

/** @param {{ modelLabel?: string }} props */
export function TovPreviewProgress({ modelLabel = "" }) {
  return (
    <TovProgressCard
      title="Genererer brand guidelines"
      stages={PREVIEW_STAGES}
      footer={`${modelLabel ? `${modelLabel} · ` : ""}typisk 30–90 sek. Eksemplet gemmes i databasen når det er klar.`}
    />
  );
}

/** @param {{ modelLabel?: string }} props */
export function TovRewriteProgress({ modelLabel = "" }) {
  return (
    <TovProgressCard
      title="Omskriver i kundens tone"
      stages={REWRITE_STAGES}
      footer={modelLabel ? `${modelLabel} · typisk 15–45 sek.` : "Typisk 15–45 sek."}
    />
  );
}
