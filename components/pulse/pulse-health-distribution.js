import { PulseCardHeader } from "@/components/pulse/pulse-card-header";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { usePulseData } from "@/components/pulse/pulse-data-context";

export function PulseHealthDistribution() {
  const { agencyMetrics: m, clients: CLIENTS } = usePulseData();
  const total = Math.max(m.activeClients, 1);
  const segs = [
    { label: "Sund", n: m.healthyClients, color: "var(--agency-ok)" },
    { label: "Advarsel", n: m.warnClients, color: "var(--agency-warn)" },
    { label: "Kritisk", n: m.badClients, color: "var(--agency-bad)" },
  ];

  const atRisk = CLIENTS.filter((c) => c.health !== "ok").slice(0, 4);

  return (
    <section className="tally-panel p-4 md:p-5" aria-labelledby="pulse-health-heading">
      <div id="pulse-health-heading">
        <PulseCardHeader
          title="Kundernes sundhed"
          sub={`${m.activeClients} aktive kunder — baseret på budget, aktivitet og NPS`}
        />
      </div>

      <div className="mt-4 flex h-8 overflow-hidden rounded-md bg-surface-muted-strong ring-1 ring-border/40">
        {segs.map((s) => (
          <div
            key={s.label}
            className="flex min-w-0 items-center justify-center font-sans text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]"
            style={{
              flex: s.n > 0 ? s.n : 0.001,
              backgroundColor: s.color,
            }}
          >
            {s.n > 0 ? s.n : ""}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-2 font-sans text-[11.5px] text-fg-muted sm:flex-row sm:flex-wrap sm:justify-between">
        {segs.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}{" "}
            <b className="tabular-nums text-fg">{s.n}</b>
            <span className="text-fg-quiet">({Math.round((s.n / total) * 100)}%)</span>
          </span>
        ))}
      </div>

      <hr className="my-4 border-border-soft" />

      <div className="flex flex-col gap-3">
        {atRisk.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-3 md:grid-cols-[28px_1fr_auto_100px]"
          >
            <span
              className="flex size-6 items-center justify-center rounded-lg border border-border text-[10px] font-semibold text-agency-brand-fg"
              style={{ background: `oklch(62% 0.14 ${c.hue})` }}
            >
              {c.logo}
            </span>
            <span className="truncate font-sans text-[12.5px] text-fg">{c.name}</span>
            <span className="text-[11.5px] tabular-nums text-fg-muted">
              {c.hoursThisMonth}/{c.hoursBudget}t
            </span>
            <div className="col-span-full md:col-span-1 md:col-start-4">
              <PulseUtilBar hours={c.hoursThisMonth} budget={c.hoursBudget} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
