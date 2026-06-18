import { cn } from "@/lib/utils";

function scoreColor(score) {
  if (score >= 9) return { ring: "border-agency-ok",   bg: "bg-agency-ok-soft",   text: "text-agency-ok",   label: "Promoter" };
  if (score >= 7) return { ring: "border-agency-warn", bg: "bg-agency-warn-soft", text: "text-agency-warn", label: "Passiv" };
  return            { ring: "border-agency-bad",   bg: "bg-agency-bad-soft",   text: "text-agency-bad",   label: "Detractor" };
}

/** @param {{ data: import('@/lib/demo/chat-scenarios').NpsCardData }} props */
export function NpsCard({ data }) {
  const c = scoreColor(data.score);
  return (
    <div className={cn("mt-2 rounded-xl border p-4", c.ring, c.bg)}>
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{data.client}</p>
      <div className="mt-3 flex items-center gap-4">
        <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2", c.ring, "bg-surface-card")}>
          <span className={cn("font-mono text-2xl font-semibold tabular-nums", c.text)}>{data.score}</span>
        </div>
        <div>
          <span className={cn("inline-block rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", c.bg, c.text)}>
            {c.label}
          </span>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">{data.respondent}</p>
          {data.avgLast6 != null ? (
            <p className="font-sans text-[11px] text-fg-muted">Gns. seneste 6 mdr.: {data.avgLast6}</p>
          ) : null}
        </div>
      </div>
      {data.quote ? (
        <blockquote className="mt-3 border-l-2 border-current pl-3 font-sans text-[12.5px] italic text-fg">
          {data.quote}
        </blockquote>
      ) : null}
    </div>
  );
}
