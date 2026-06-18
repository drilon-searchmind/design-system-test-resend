"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_CHANNEL,
  channelGroups,
  feed,
  getFeedEntry,
  resolveResponseId,
} from "@/lib/demo/chat-scenarios";
import { useTutorialPlayer } from "@/hooks/use-tutorial-player";

import { ChannelSidebar } from "./channel-sidebar";
import { MessageBubble } from "./message-bubble";
import { PromptChips } from "./prompt-chips";
import { TutorialBar } from "./tutorial-bar";

const BASE_TYPING_MS = 36;

const FALLBACK_ENTRY = {
  id: "__fallback__",
  type: "assistant",
  author: "Searchmind AI",
  ts: "",
  text: "Det er en demo — prøv et af forslagene herover ✨",
  card: null,
};

function channelName(id) {
  for (const g of channelGroups) {
    const ch = g.channels.find((c) => c.id === id);
    if (ch) return ch.name;
  }
  return id;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function IconSend({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M1.5 1.5l13 6.5-13 6.5V9.5L11 8 1.5 6.5V1.5z" /></svg>;
}
function IconSparkle({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" /></svg>;
}

export function ChatPanel() {
  const [speed, setSpeed] = useState(1);            // 1× = comfortable baseline
  const speedRef = useRef(1);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const player = useTutorialPlayer(speedRef);

  const [activeChannel, setActiveChannel] = useState(DEFAULT_CHANNEL);
  const [inputValue, setInputValue] = useState("");
  const [freeMessages, setFreeMessages] = useState(/** @type {Array<{key:string,entry:any,channel:string}>} */ ([]));
  const [freeTyping, setFreeTyping] = useState(/** @type {{entry:any,channel:string,text:string}|null} */ (null));

  const feedEndRef = useRef(null);
  const freeTimers = useRef(/** @type {Array<ReturnType<typeof setTimeout>>} */ ([]));

  // Keep active channel synced to tutorial step
  useEffect(() => {
    if (player.mode === "tutorial" && player.currentChannel) {
      setActiveChannel(player.currentChannel);
    }
  }, [player.mode, player.currentChannel]);

  // Auto-scroll
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [player.messages, player.typing, freeMessages, freeTyping, activeChannel]);

  // Resident messages for the active channel (free mode "cold open")
  const residentMessages = useMemo(
    () => feed.filter((f) => f.resident && f.channel === activeChannel).map((entry) => ({ key: entry.id, entry })),
    [activeChannel],
  );

  const freeForChannel = useMemo(
    () => freeMessages.filter((m) => m.channel === activeChannel),
    [freeMessages, activeChannel],
  );

  // ── Free-mode typing animation ──────────────────────────────────────────────
  const commitFree = useCallback((entry, channel) => {
    const key = `free-${entry.id}-${freeTimers.current.length}-${channel}`;
    setFreeMessages((m) => [...m, { key, entry, channel }]);
  }, []);

  const animateFree = useCallback((entry, channel) => {
    if (prefersReducedMotion() || !entry.text) {
      commitFree(entry, channel);
      return;
    }
    const full = entry.text;
    let i = 0;
    setFreeTyping({ entry, channel, text: "" });
    const tick = () => {
      i++;
      setFreeTyping({ entry, channel, text: full.slice(0, i) });
      if (i < full.length) {
        freeTimers.current.push(setTimeout(tick, BASE_TYPING_MS / (speedRef.current || 1)));
      } else {
        setFreeTyping(null);
        commitFree(entry, channel);
      }
    };
    freeTimers.current.push(setTimeout(tick, BASE_TYPING_MS / (speedRef.current || 1)));
  }, [commitFree]);

  // Respond with a feed entry (assistant), optionally after a user message
  const respond = useCallback((feedId, channel) => {
    const entry = feedId ? getFeedEntry(feedId) : null;
    const finalEntry = entry ?? FALLBACK_ENTRY;
    const finalChannel = entry?.channel ?? channel;
    // If responding in a different channel, switch the view there
    if (finalChannel !== channel) setActiveChannel(finalChannel);
    setTimeout(() => animateFree(finalEntry, finalChannel), 250 / (speedRef.current || 1));
  }, [animateFree]);

  const pushUser = useCallback((text, channel) => {
    const key = `u-${Date.now()}-${Math.round(text.length)}`;
    const ts = new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
    const entry = { id: key, type: "user", author: "Dig", ts, text, card: null };
    setFreeMessages((m) => [...m, { key, entry, channel }]);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const ensureFreeMode = useCallback(() => {
    if (player.mode !== "free") player.enterFreeMode();
  }, [player]);

  const handleSend = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    ensureFreeMode();
    const ch = activeChannel;
    pushUser(trimmed, ch);
    setInputValue("");
    const id = resolveResponseId(trimmed);
    respond(id, ch);
  }, [activeChannel, ensureFreeMode, pushUser, respond]);

  const handleSuggestedReply = useCallback((label) => {
    ensureFreeMode();
    const ch = player.currentChannel ?? activeChannel;
    pushUser(label, ch);
    const id = resolveResponseId(label);
    respond(id, ch);
  }, [activeChannel, ensureFreeMode, player.currentChannel, pushUser, respond]);

  const handleChipSelect = useCallback((feedId, label) => {
    ensureFreeMode();
    const ch = activeChannel;
    pushUser(label, ch);
    respond(feedId, ch);
  }, [activeChannel, ensureFreeMode, pushUser, respond]);

  // Card buttons → follow-up entry (no user bubble)
  const handleCardAction = useCallback((feedId) => {
    if (!feedId) return;
    ensureFreeMode();
    respond(feedId, activeChannel);
  }, [activeChannel, ensureFreeMode, respond]);

  const handleChannelSelect = useCallback((channelId) => {
    setActiveChannel(channelId);
    if (player.mode === "tutorial") player.enterFreeMode();
    if (player.mode === "idle") player.enterFreeMode();
  }, [player]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const isIdle = player.mode === "idle";
  const isTutorial = player.mode === "tutorial";

  const tutorialList = player.messages;
  const showTyping = player.typing;

  const freeList = [...residentMessages, ...freeForChannel];
  const freeEmpty = player.mode === "free" && freeList.length === 0 && !freeTyping;

  return (
    <div className="flex h-full">
      {/* ── Channel sidebar (Slack-like) ── */}
      <ChannelSidebar
        className="hidden md:flex"
        activeChannel={activeChannel}
        onSelect={handleChannelSelect}
        highlightChannel={isTutorial ? player.currentChannel : null}
      />

      {/* ── Chat column ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-solid-cta-bg">
              <IconSparkle size={15} />
            </div>
            <div>
              <p className="font-sans text-[13px] font-semibold text-fg">
                #{channelName(activeChannel)}
              </p>
              <p className="font-mono text-[10.5px] text-fg-muted">Searchmind AI · Chat-first CRM</p>
            </div>
          </div>
          <span className="rounded-full border border-agency-warn-border bg-agency-warn-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-agency-warn">
            Demo-data
          </span>
        </div>

        {/* Tutorial bar */}
        {isTutorial ? (
          <TutorialBar
            playing={player.playing}
            stepIndex={player.stepIndex}
            totalSteps={player.totalSteps}
            currentCaption={player.currentCaption}
            speed={speed}
            onSpeedChange={setSpeed}
            onPlay={player.resume}
            onPause={player.pause}
            onNext={player.next}
            onPrev={player.prev}
            onScrub={player.scrubTo}
            onExit={player.enterFreeMode}
          />
        ) : null}

        {/* Feed */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">

            {/* Idle */}
            {isIdle ? (
              <div className="flex flex-col items-center gap-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-solid-cta-bg shadow-agency-raised">
                  <IconSparkle size={28} />
                </div>
                <div>
                  <h2 className="font-sans text-lg font-semibold text-fg">AI Chat-demo</h2>
                  <p className="mt-1 font-sans text-[13px] text-fg-muted">
                    Kør tutorial for at se alle scenarier, eller stil et spørgsmål direkte.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={player.startTutorial}
                    className="flex items-center gap-2 rounded-full bg-solid-cta-bg px-5 py-2.5 font-sans text-[13px] font-semibold text-solid-cta-fg hover:bg-solid-cta-hover"
                  >
                    <IconSparkle size={13} />
                    Start tutorial
                  </button>
                  <button
                    type="button"
                    onClick={player.enterFreeMode}
                    className="rounded-full border border-border px-5 py-2.5 font-sans text-[13px] text-fg-muted hover:bg-surface-muted hover:text-fg"
                  >
                    Fri tekst
                  </button>
                </div>
                <div className="w-full max-w-lg">
                  <PromptChips onSelect={handleChipSelect} />
                </div>
              </div>
            ) : null}

            {/* Tutorial messages */}
            {isTutorial ? (
              <>
                {tutorialList.map(({ key, entry }) => (
                  <MessageBubble
                    key={key}
                    entry={entry}
                    onSuggestedReply={handleSuggestedReply}
                    onAction={handleCardAction}
                  />
                ))}
                {showTyping ? (
                  <MessageBubble
                    key={`typing-${showTyping.key}`}
                    entry={showTyping.entry}
                    typingText={showTyping.text}
                  />
                ) : null}
              </>
            ) : null}

            {/* Free messages */}
            {player.mode === "free" ? (
              <>
                {freeEmpty ? (
                  <div className="py-12 text-center">
                    <p className="font-sans text-[13px] text-fg-muted">
                      Ingen beskeder i <span className="font-medium text-fg">#{channelName(activeChannel)}</span> endnu.
                    </p>
                    <p className="mt-1 font-sans text-[12px] text-fg-quiet">Stil et spørgsmål nedenfor ↓</p>
                  </div>
                ) : null}
                {freeList.map(({ key, entry }) => (
                  <MessageBubble
                    key={key}
                    entry={entry}
                    onSuggestedReply={handleSuggestedReply}
                    onAction={handleCardAction}
                  />
                ))}
                {freeTyping && freeTyping.channel === activeChannel ? (
                  <MessageBubble
                    key="free-typing"
                    entry={freeTyping.entry}
                    typingText={freeTyping.text}
                  />
                ) : null}
              </>
            ) : null}

            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Composer (free mode) */}
        {player.mode === "free" ? (
          <div className="shrink-0 border-t border-border bg-surface-header/80 px-4 py-3 backdrop-blur-sm">
            <div className="mx-auto max-w-2xl">
              <PromptChips onSelect={handleChipSelect} className="mb-3" />
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                className="flex items-end gap-2"
              >
                <textarea
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
                  }}
                  placeholder={`Besked til #${channelName(activeChannel)}…`}
                  className={cn(
                    "flex-1 resize-none overflow-hidden rounded-2xl border border-border bg-surface-card px-4 py-3",
                    "font-sans text-[13px] text-fg placeholder:text-fg-muted",
                    "focus:border-solid-cta-bg focus:outline-none transition-colors",
                  )}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    inputValue.trim()
                      ? "bg-solid-cta-bg text-solid-cta-fg hover:bg-solid-cta-hover"
                      : "bg-surface-muted text-fg-muted",
                  )}
                  aria-label="Send"
                >
                  <IconSend />
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
