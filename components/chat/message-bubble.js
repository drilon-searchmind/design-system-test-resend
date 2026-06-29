import { cn } from "@/lib/utils";
import { EmailDraftCard } from "./cards/email-draft-card";
import { HeatmapCard } from "./cards/heatmap-card";
import { MetricGridCard } from "./cards/metric-grid-card";
import { NpsCard } from "./cards/nps-card";
import { OpportunityCard } from "./cards/opportunity-card";
import { PacingCard } from "./cards/pacing-card";
import { PlanCard } from "./cards/plan-card";
import { RenewalCard } from "./cards/renewal-card";
import { ReportCard } from "./cards/report-card";
import { ScheduleCard } from "./cards/schedule-card";
import { SparklineCard } from "./cards/sparkline-card";
import { TableCard } from "./cards/table-card";
import { TaskConfirmCard } from "./cards/task-confirm-card";

const AUTHOR_AVATAR = {
  "Searchmind AI": { initials: "AI", className: "bg-solid-cta-bg text-solid-cta-fg" },
  "Astrid":        { initials: "AS", className: "bg-agency-brand-soft text-agency-brand" },
  "Oliver":        { initials: "OL", className: "bg-agency-dep-ppc/20 text-agency-dep-ppc" },
  "Maja":          { initials: "MJ", className: "bg-agency-dep-seo/20 text-agency-dep-seo" },
  "Frederik":      { initials: "FR", className: "bg-agency-dep-email/20 text-agency-dep-email" },
  "Sofie":         { initials: "SO", className: "bg-agency-dep-content/20 text-agency-dep-content" },
  "Dig":           { initials: "DU", className: "bg-surface-muted-strong text-fg" },
};

function Avatar({ author }) {
  const a = AUTHOR_AVATAR[author] ?? { initials: author.slice(0, 2).toUpperCase(), className: "bg-surface-muted text-fg" };
  return (
    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold", a.className)}>
      {a.initials}
    </span>
  );
}

function TypeBadge({ type }) {
  if (type === "alert") return (
    <span className="rounded-full border border-agency-bad-border bg-agency-bad-soft px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-agency-bad">
      Alert
    </span>
  );
  if (type === "summary") return (
    <span className="rounded-full border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-agency-warn">
      Overblik
    </span>
  );
  return null;
}

// Simple markdown-ish renderer — bold (**text**) + newlines
function RenderText({ text, typing }) {
  const display = typing ?? text;
  const parts = display.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
      {typing != null && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-fg align-middle" />}
    </p>
  );
}

function CardRenderer({ card, onAction }) {
  if (!card) return null;
  if (card.kind === "sparkline")    return <SparklineCard data={card.data} />;
  if (card.kind === "metric-grid")  return <MetricGridCard data={card.data} />;
  if (card.kind === "table")        return <TableCard data={card.data} />;
  if (card.kind === "nps")          return <NpsCard data={card.data} />;
  if (card.kind === "schedule")     return <ScheduleCard data={card.data} onAction={onAction} />;
  if (card.kind === "task-confirm") return <TaskConfirmCard data={card.data} onAction={onAction} />;
  if (card.kind === "email-draft")  return <EmailDraftCard data={card.data} onAction={onAction} />;
  if (card.kind === "opportunity")  return <OpportunityCard data={card.data} onAction={onAction} />;
  if (card.kind === "plan")         return <PlanCard data={card.data} onAction={onAction} />;
  if (card.kind === "heatmap")      return <HeatmapCard data={card.data} onAction={onAction} />;
  if (card.kind === "report")       return <ReportCard data={card.data} onAction={onAction} />;
  if (card.kind === "pacing")       return <PacingCard data={card.data} />;
  if (card.kind === "renewal")      return <RenewalCard data={card.data} onAction={onAction} />;
  return null;
}

/**
 * @param {{
 *   entry: import('@/lib/demo/chat-scenarios').FeedEntry;
 *   typingText?: string | null;
 *   onSuggestedReply?: (text: string) => void;
 *   onAction?: (feedId: string) => void;
 * }} props
 */
export function MessageBubble({ entry, typingText, onSuggestedReply, onAction }) {
  const isUser = entry.author === "Dig";
  const isTyping = typingText != null;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-solid-cta-bg px-4 py-2.5">
          <p className="font-sans text-[13px] font-medium text-solid-cta-fg">{entry.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <Avatar author={entry.author} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-sans text-[12px] font-semibold text-fg">{entry.author}</span>
          <TypeBadge type={entry.type} />
          <span className="font-mono text-[11px] text-fg-muted">{entry.ts}</span>
        </div>

        <RenderText text={entry.text} typing={isTyping ? typingText : null} />

        {!isTyping && entry.card ? (
          <CardRenderer card={entry.card} onAction={onAction} />
        ) : null}

        {!isTyping && entry.suggestedReplies?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {entry.suggestedReplies.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSuggestedReply?.(r)}
                className="rounded-full border border-border bg-surface-muted px-3 py-1 font-sans text-[12px] text-fg-muted hover:border-solid-cta-bg hover:bg-solid-cta-bg/10 hover:text-fg"
              >
                {r}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
