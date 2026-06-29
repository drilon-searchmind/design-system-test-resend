import { formatPercent } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

function collectInsights(client, utilRatio) {
  /** @type {Array<{ severity: 'bad'|'warn'|'neutral'; label: string; body: string }>} */
  const list = [];

  if (client.health === "bad") {
    list.push({
      severity: "bad",
      label: "Kontosundhed",
      body: "Markeret kritisk — gennemgå scope, økonomi og kundens forventninger i kommende sprint.",
    });
  }
  if (client.health === "warn") {
    list.push({
      severity: "warn",
      label: "Kontosundhed",
      body: "Advarselsniveau — dokumentér konkrete aftaler før næste større leverance.",
    });
  }
  if (utilRatio > 1) {
    list.push({
      severity: "bad",
      label: "Timebudget",
      body: `Tidsforbruget overstiger aftalt månedbudget (${client.hoursThisMonth} / ${client.hoursBudget} t · ${formatPercent(utilRatio)} udnyttelse).`,
    });
  }
  if (client.monthlyProfitMargin < 0) {
    list.push({
      severity: "bad",
      label: "Margin",
      body: `Negativ leverancemargin denne måned (${formatPercent(client.monthlyProfitMargin)}) — revisér prismodel eller scope.`,
    });
  }

  client.tags?.forEach((tag) => {
    if (/budget|over\s*budget/i.test(tag)) {
      list.push({
        severity: "warn",
        label: tag,
        body: "Budgettag — prioritér forecasting og kundekommunikation.",
      });
    }
    if (/eskaler/i.test(tag)) {
      list.push({
        severity: "bad",
        label: tag,
        body: "Eskalert konto — sørg for tydelig ejerkæde på kundesiden og internt sponsorat.",
      });
    }
  });

  const lastScore = client.npsHistory?.[client.npsHistory.length - 1]?.score;
  if (lastScore != null && lastScore < 45) {
    list.push({
      severity: "warn",
      label: "NPS",
      body: `Seneste måling (${lastScore}) kræver follow-up før næste mødetæller.`,
    });
  }

  if (client.status === "paused") {
    list.push({
      severity: "neutral",
      label: "Kontostatus",
      body: "Konto på pause — reaktiver aftaler før der planlægges ekstra volumen.",
    });
  }

  if (client.status === "inactive") {
    list.push({
      severity: "warn",
      label: "Kontostatus",
      body: "Konto registreret inaktiv — overvej lukning eller win-back playbook.",
    });
  }

  if (list.length === 0) {
    list.push({
      severity: "neutral",
      label: "Overblik",
      body:
        "Ingen automatiske røde flag — behold rytmiske checkpoints alligevel.",
    });
  }

  return list.slice(0, 8);
}

/**
 * Automatisk konsolidering af signaler ud fra eksisterende kunde-felt (kun mock).
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number] }} props
 */
export function ClientDetailInsightsCard({ client }) {
  const utilRatio = client.hoursBudget > 0 ? client.hoursThisMonth / client.hoursBudget : 0;
  const bullets = collectInsights(client, utilRatio);

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Signals & KPI-hints
      </h2>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Afledt af sundhedstag, margin, udnyttelse, NPS og tags — erstattes af playbook-triggers på DB.
      </p>
      <ul className="mt-4 flex flex-col gap-3 font-sans text-[13px]">
        {bullets.map((b, idx) => (
          <li
            key={`${idx}-${b.label}`}
            className={cn(
              "rounded-xl border px-3 py-2",
              b.severity === "bad" && "border-agency-bad-border bg-agency-bad-soft/35",
              b.severity === "warn" && "border-agency-warn-border bg-agency-warn-soft/30",
              b.severity === "neutral" && "border-border bg-surface-muted/40",
            )}
          >
            <p className="font-semibold text-fg">{b.label}</p>
            <p className="mt-1 leading-relaxed text-fg-muted">{b.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
