"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getFeedEntry, tutorialSteps } from "@/lib/demo/chat-scenarios";

// 1.0× = the comfortable presentation baseline (≈ previous 0.5× setting).
// Lower multipliers (0.5×/0.75×) play slower; 1.5× plays faster.
const BASE_TYPING_MS = 36;    // ms per character at speed 1.0
const BASE_PAUSE_MS  = 1800;  // pause between steps at speed 1.0

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function userEntryFor(step) {
  return {
    id: `u-${step.feedId}`,
    type: "user",
    author: "Dig",
    ts: "",
    text: step.userMessage,
    card: null,
  };
}

/** Build the full (non-animated) message list for steps 0..idx. */
function materializeUpTo(idx) {
  const out = [];
  for (let s = 0; s <= idx; s++) {
    const step = tutorialSteps[s];
    if (!step) continue;
    if (step.userMessage) out.push({ key: `u${s}`, entry: userEntryFor(step) });
    const entry = getFeedEntry(step.feedId);
    if (entry) out.push({ key: `a${s}`, entry });
  }
  return out;
}

/**
 * Tutorial player state machine.
 * @param {{ current: number }} speedRef — live playback speed multiplier (e.g. 0.5)
 */
export function useTutorialPlayer(speedRef) {
  const [mode, setMode]           = useState(/** @type {"idle"|"tutorial"|"free"} */ ("idle"));
  const [playing, setPlaying]     = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [messages, setMessages]   = useState(/** @type {Array<{key:string,entry:any}>} */ ([]));
  const [typing, setTyping]       = useState(/** @type {{key:string,entry:any,text:string}|null} */ (null));

  const animatedRef = useRef(/** @type {Set<number>} */ (new Set()));
  const timersRef   = useRef(/** @type {Array<ReturnType<typeof setTimeout>>} */ ([]));

  const totalSteps = tutorialSteps.length;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const speed = () => speedRef?.current ?? 1;

  // Animate one assistant entry; resolves when fully shown.
  const animateAssistant = useCallback((stepIdx) => {
    return new Promise((resolve) => {
      const step = tutorialSteps[stepIdx];
      const entry = getFeedEntry(step.feedId);
      if (!entry) { resolve(); return; }

      const finish = () => {
        setTyping(null);
        setMessages((m) => (m.some((x) => x.key === `a${stepIdx}`) ? m : [...m, { key: `a${stepIdx}`, entry }]));
        animatedRef.current.add(stepIdx);
        resolve();
      };

      if (prefersReducedMotion() || !entry.text) { finish(); return; }

      const full = entry.text;
      let i = 0;
      setTyping({ key: `a${stepIdx}`, entry, text: "" });
      const tick = () => {
        i++;
        setTyping({ key: `a${stepIdx}`, entry, text: full.slice(0, i) });
        if (i < full.length) {
          timersRef.current.push(setTimeout(tick, BASE_TYPING_MS / speed()));
        } else {
          finish();
        }
      };
      timersRef.current.push(setTimeout(tick, BASE_TYPING_MS / speed()));
    });
  }, []);

  // Play a single step: show user message (if any), then animate/show assistant.
  const playStep = useCallback(async (stepIdx) => {
    const step = tutorialSteps[stepIdx];
    if (!step) return;

    // user bubble
    if (step.userMessage) {
      setMessages((m) => (m.some((x) => x.key === `u${stepIdx}`) ? m : [...m, { key: `u${stepIdx}`, entry: userEntryFor(step) }]));
    }

    if (animatedRef.current.has(stepIdx)) {
      // already shown — ensure present, no re-animation
      const entry = getFeedEntry(step.feedId);
      if (entry) setMessages((m) => (m.some((x) => x.key === `a${stepIdx}`) ? m : [...m, { key: `a${stepIdx}`, entry }]));
      return;
    }

    // small beat so the user bubble lands before the AI "types"
    if (step.userMessage && !prefersReducedMotion()) {
      await new Promise((r) => timersRef.current.push(setTimeout(r, 350 / speed())));
    }
    await animateAssistant(stepIdx);
  }, [animateAssistant]);

  // Auto-advance loop
  useEffect(() => {
    if (!playing || stepIndex < 0) return;
    let cancelled = false;

    (async () => {
      await playStep(stepIndex);
      if (cancelled) return;
      timersRef.current.push(setTimeout(() => {
        if (cancelled) return;
        if (stepIndex + 1 < totalSteps) {
          setStepIndex(stepIndex + 1);
        } else {
          setPlaying(false);
          setMode("free");
        }
      }, BASE_PAUSE_MS / speed()));
    })();

    return () => { cancelled = true; clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, stepIndex]);

  // ── Public API ──────────────────────────────────────────────────────────────

  const startTutorial = useCallback(() => {
    clearTimers();
    animatedRef.current = new Set();
    setMessages([]);
    setTyping(null);
    setMode("tutorial");
    setPlaying(true);
    setStepIndex(0);
  }, [clearTimers]);

  const pause  = useCallback(() => { clearTimers(); setPlaying(false); }, [clearTimers]);
  const resume = useCallback(() => { setPlaying(true); }, []);

  const jumpTo = useCallback((target) => {
    clearTimers();
    setPlaying(false);
    setTyping(null);
    const clamped = Math.max(0, Math.min(target, totalSteps - 1));
    for (let i = 0; i <= clamped; i++) animatedRef.current.add(i);
    setMessages(materializeUpTo(clamped));
    setStepIndex(clamped);
  }, [clearTimers, totalSteps]);

  const next = useCallback(() => jumpTo(stepIndex + 1), [jumpTo, stepIndex]);
  const prev = useCallback(() => jumpTo(stepIndex - 1), [jumpTo, stepIndex]);
  const scrubTo = useCallback((idx) => jumpTo(idx), [jumpTo]);

  const enterFreeMode = useCallback(() => {
    clearTimers();
    setPlaying(false);
    setTyping(null);
    setMode("free");
  }, [clearTimers]);

  const currentStep = stepIndex >= 0 && stepIndex < totalSteps ? tutorialSteps[stepIndex] : null;

  return {
    mode,
    playing,
    stepIndex,
    totalSteps,
    messages,
    typing,
    currentCaption: currentStep?.caption ?? null,
    currentChannel: currentStep?.channel ?? null,
    startTutorial,
    pause,
    resume,
    next,
    prev,
    scrubTo,
    enterFreeMode,
  };
}
