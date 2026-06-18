"use client";

import { cn } from "@/lib/utils";

/** @param {{ size?: number, className?: string }} props */
function IconPlay({ size = 14, className }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden><path d="M3 2.5l8 4.5-8 4.5V2.5z" /></svg>;
}
function IconPause({ size = 14, className }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden><rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/></svg>;
}
function IconPrev({ size = 14, className }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden><path d="M11 2.5L3 7l8 4.5V2.5z"/><rect x="2" y="2" width="2" height="10" rx="1"/></svg>;
}
function IconNext({ size = 14, className }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden><path d="M3 2.5l8 4.5-8 4.5V2.5z"/><rect x="10" y="2" width="2" height="10" rx="1"/></svg>;
}

/**
 * @param {{
 *   playing: boolean;
 *   stepIndex: number;
 *   totalSteps: number;
 *   currentCaption: string | null;
 *   speed: number;
 *   onSpeedChange: (s: number) => void;
 *   onPlay: () => void;
 *   onPause: () => void;
 *   onNext: () => void;
 *   onPrev: () => void;
 *   onScrub: (idx: number) => void;
 *   onExit: () => void;
 * }} props
 */
export function TutorialBar({ playing, stepIndex, totalSteps, currentCaption, speed, onSpeedChange, onPlay, onPause, onNext, onPrev, onScrub, onExit }) {
  const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
  const SPEEDS = [0.5, 0.75, 1, 1.5];

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-surface-muted/60 px-4 py-3 backdrop-blur-sm">
      {/* Caption */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate font-sans text-[12.5px] text-fg-muted">
          {currentCaption ?? "Tutorial · AI Chat-demo"}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-sans text-[11px] text-fg-muted hover:bg-surface-muted hover:text-fg"
        >
          Afslut tutorial
        </button>
      </div>

      {/* Controls + scrubber */}
      <div className="flex items-center gap-3">
        {/* Prev */}
        <button
          type="button"
          onClick={onPrev}
          disabled={stepIndex <= 0}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-border",
            stepIndex <= 0 ? "text-fg-muted opacity-40" : "text-fg hover:bg-surface-muted",
          )}
          aria-label="Forrige"
        >
          <IconPrev />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-solid-cta-bg text-solid-cta-fg hover:bg-solid-cta-hover"
          aria-label={playing ? "Pause" : "Afspil"}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={onNext}
          disabled={stepIndex >= totalSteps - 1}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-border",
            stepIndex >= totalSteps - 1 ? "text-fg-muted opacity-40" : "text-fg hover:bg-surface-muted",
          )}
          aria-label="Næste"
        >
          <IconNext />
        </button>

        {/* Scrubber */}
        <div className="relative flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted-strong">
            <div
              className="h-full rounded-full bg-solid-cta-bg transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={stepIndex}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Tutorial position"
          />
        </div>

        {/* Step counter */}
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-muted">
          {stepIndex + 1} / {totalSteps}
        </span>

        {/* Speed control */}
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface-card p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[10.5px] tabular-nums transition-colors",
                speed === s ? "bg-solid-cta-bg font-semibold text-solid-cta-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
