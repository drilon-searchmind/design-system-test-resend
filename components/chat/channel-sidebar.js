"use client";

import { cn } from "@/lib/utils";
import { channelGroups } from "@/lib/demo/chat-scenarios";

function HashIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M6 2L4.5 14M11.5 2L10 14M2.5 5.5h12M1.5 10.5h12" strokeLinecap="round" />
    </svg>
  );
}

/**
 * @param {{
 *   activeChannel: string;
 *   onSelect: (channelId: string) => void;
 *   highlightChannel?: string | null;
 *   className?: string;
 * }} props
 */
export function ChannelSidebar({ activeChannel, onSelect, highlightChannel, className }) {
  return (
    <aside className={cn("flex w-[210px] shrink-0 flex-col border-r border-border bg-surface-muted/40", className)}>
      <div className="flex h-[52px] shrink-0 items-center border-b border-border px-4">
        <span className="font-sans text-[13px] font-semibold text-fg">Kanaler</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {channelGroups.map((group) => (
          <div key={group.id} className="mb-2">
            <p className="px-4 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {group.label}
            </p>
            {group.channels.map((ch) => {
              const active = ch.id === activeChannel;
              const highlight = ch.id === highlightChannel && !active;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-4 py-1.5 text-left font-sans text-[13px] transition-colors",
                    active
                      ? "bg-solid-cta-bg/15 font-medium text-fg"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                    highlight && "bg-solid-cta-bg/10",
                  )}
                >
                  <span className={cn("shrink-0", active ? "text-accent" : "text-fg-quiet")}>
                    <HashIcon />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{ch.name}</span>
                  {ch.unread ? (
                    <span className="shrink-0 rounded-full bg-accent-warning px-1.5 py-0.5 font-mono text-[9px] font-bold leading-none text-canvas">
                      {ch.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
