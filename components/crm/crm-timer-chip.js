"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IconClock } from "@/components/crm/icons";
import { TIMER_SESSION_CHANGED_EVENT } from "@/lib/crm/timer-session-events";
import { cn } from "@/lib/utils";

import { useTimerModal } from "./timer-modal-context";

/** @param {{ startedAt?: string | null }} props */
function elapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function formatHms(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function CrmTimerChip() {
  const { openTimer, open: timerModalOpen } = useTimerModal();
  const [payload, setPayload] = useState(
    /** @type {{ active: Record<string, unknown> | null } | null} */ (null),
  );
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevModalOpen = useRef(timerModalOpen);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "fail");
      setPayload({ active: data.active ?? null });
    } catch {
      setPayload({ active: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(TIMER_SESSION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(TIMER_SESSION_CHANGED_EVENT, onChanged);
  }, [refresh]);

  useEffect(() => {
    if (prevModalOpen.current && !timerModalOpen) {
      queueMicrotask(() => {
        void refresh();
      });
    }
    prevModalOpen.current = timerModalOpen;
  }, [timerModalOpen, refresh]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const active = payload?.active ?? null;
  const startedAt = active && typeof active.startedAt === "string" ? active.startedAt : null;
  const running = Boolean(active && startedAt);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [running, refresh]);

  const secs = elapsedSeconds(startedAt);
  void tick;

  if (loading && !payload) {
    return (
      <span
        className="inline-block h-8 w-[72px] shrink-0 animate-pulse rounded-full bg-skeleton sm:w-[108px]"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={openTimer}
      aria-haspopup="dialog"
      aria-expanded={timerModalOpen}
      className={cn(
        "inline-flex h-8 min-w-0 max-w-[min(140px,38vw)] shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] tabular-nums sm:max-w-[240px] sm:gap-2 sm:px-3",
        running
          ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
          : "border-border bg-surface-muted text-fg-muted hover:border-agency-brand-border hover:bg-agency-brand-soft/60 hover:text-agency-brand",
      )}
      title={running ? "Timer kører i baggrunden · åbn panelet" : "Åbn timer"}
    >
      <IconClock size={14} className="shrink-0 opacity-90" />
      {running ? (
        <>
          <span className="min-w-[48px] shrink-0 truncate text-left font-semibold sm:min-w-[52px]">
            {formatHms(secs)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px] font-normal opacity-90 sm:max-w-[100px]">
            {typeof active.clientName === "string" ? active.clientName : "—"}
          </span>
        </>
      ) : (
        <span className="truncate text-fg-soft">Timer</span>
      )}
    </button>
  );
}
