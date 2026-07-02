"use client";

import { PulseIconChevronRight } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

/** @typedef {'todo' | 'doing' | 'review' | 'done' | 'blocked' | 'cancelled'} TaskUiStatus */

const WORKFLOW = /** @type {const} */ ([
  { id: "todo", label: "Afventer", hint: "Ikke startet endnu" },
  { id: "doing", label: "I gang", hint: "Arbejde pågår" },
  { id: "review", label: "Review", hint: "Klar til gennemgang" },
  { id: "done", label: "Færdig", hint: "Afsluttet og leveret", showCheck: true },
]);

const SECONDARY = /** @type {const} */ ([
  { id: "blocked", label: "Blokeret", hint: "Afventer afklaring" },
  { id: "cancelled", label: "Afbrudt", hint: "Opgaven er stoppet" },
]);

const ACTIVE_STYLES = {
  todo: "border-fg bg-fg text-canvas shadow-sm",
  doing: "border-agency-brand bg-agency-brand text-white shadow-sm",
  review: "border-agency-warn bg-agency-warn text-canvas shadow-sm",
  done: "border-agency-ok bg-agency-ok text-white shadow-sm",
  blocked: "border-agency-bad bg-agency-bad text-white shadow-sm",
  cancelled: "border-fg-quiet bg-fg-quiet text-canvas shadow-sm",
};

const IDLE_STYLES = {
  todo: "border-border bg-surface-muted/50 text-fg-muted hover:border-border hover:bg-surface-muted hover:text-fg",
  doing: "border-agency-brand-border/60 bg-transparent text-fg-muted hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand",
  review: "border-agency-warn-border/60 bg-transparent text-fg-muted hover:border-agency-warn-border hover:bg-agency-warn-soft hover:text-agency-warn",
  done: "border-agency-ok-border/60 bg-transparent text-fg-muted hover:border-agency-ok-border hover:bg-agency-ok-soft hover:text-agency-ok",
  blocked: "border-agency-bad-border/60 bg-transparent text-fg-muted hover:border-agency-bad-border hover:bg-agency-bad-soft hover:text-agency-bad",
  cancelled: "border-border bg-transparent text-fg-quiet hover:border-border hover:bg-surface-muted hover:text-fg-muted",
};

/**
 * @param {{
 *   status: TaskUiStatus;
 *   onStatusChange?: (status: TaskUiStatus) => void;
 *   disabled?: boolean;
 *   saving?: boolean;
 *   readOnlyHint?: string;
 * }} props
 */
export function TaskDetailStatusBar({
  status,
  onStatusChange,
  disabled = false,
  saving = false,
  readOnlyHint,
}) {
  const interactive = !disabled && typeof onStatusChange === "function";
  const blocked = disabled || saving;

  /**
   * @param {TaskUiStatus} id
   * @param {string} label
   * @param {string} hint
   * @param {boolean} [showCheck]
   */
  function renderButton(id, label, hint, showCheck = false) {
    const isActive = status === id;
    const styleKey = /** @type {keyof typeof ACTIVE_STYLES} */ (id);

    return (
      <button
        key={id}
        type="button"
        title={hint}
        disabled={blocked || isActive}
        aria-pressed={isActive}
        aria-current={isActive ? "step" : undefined}
        onClick={() => {
          if (!interactive || isActive) return;
          onStatusChange(/** @type {TaskUiStatus} */ (id));
        }}
        className={cn(
          "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2.5 font-sans text-[11px] font-semibold transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agency-brand focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
          isActive ? ACTIVE_STYLES[styleKey] : IDLE_STYLES[styleKey],
          isActive && "pointer-events-none",
          blocked && !isActive && "cursor-not-allowed opacity-45",
          interactive && !isActive && !blocked && "cursor-pointer",
        )}
      >
        {showCheck ?
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={cn("shrink-0", isActive ? "opacity-100" : "opacity-70")}
          >
            <path
              d="M5 12.5 9.5 17 19 7"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        : null}
        {label}
      </button>
    );
  }

  return (
    <section
      className="tally-panel flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 md:px-4"
      aria-label="Opgavestatus"
    >
      <span className="mr-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Status
      </span>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Primær workflow">
        {WORKFLOW.map((step, index) => (
          <div key={step.id} className="flex items-center gap-1.5">
            {renderButton(step.id, step.label, step.hint, "showCheck" in step && step.showCheck === true)}
            {index < WORKFLOW.length - 1 ?
              <PulseIconChevronRight size={11} className="hidden shrink-0 text-fg-quiet sm:block" aria-hidden />
            : null}
          </div>
        ))}
      </div>

      <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sekundær status">
        {SECONDARY.map((step) => renderButton(step.id, step.label, step.hint))}
      </div>

      {saving ?
        <span className="ml-auto shrink-0 font-sans text-[10px] text-fg-quiet">Gemmer…</span>
      : !interactive && readOnlyHint ?
        <span className="sr-only">{readOnlyHint}</span>
      : null}
    </section>
  );
}
