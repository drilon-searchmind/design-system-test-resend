import { DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

function formatDaDate(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

const NPS_INTERVAL_DA = {
  monthly: "Månedlig",
  quarterly: "Kvartalsvis",
  biannual: "Halvårlig",
  annual: "Årlig",
};

/**
 * @param {{ client: import('@/lib/crm/static-data').CLIENTS[number] }} props
 */
export function ClientDetailMetaCard({ client }) {
  const intervalKey = client.npsInterval;
  const intervalLabel =
    intervalKey && intervalKey in NPS_INTERVAL_DA
      ? NPS_INTERVAL_DA[/** @type {keyof typeof NPS_INTERVAL_DA} */ (intervalKey)]
      : intervalKey ?? "—";

  return (
    <div className="tally-panel px-4 py-3 md:px-5 md:py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-fg-muted">
          <div>
            <dt className="text-fg-soft">Start</dt>
            <dd className="mt-0.5 tabular-nums text-fg">{formatDaDate(client.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">Fornyelse</dt>
            <dd className="mt-0.5 tabular-nums text-fg">{formatDaDate(client.renewalAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-soft">NPS-cyklus</dt>
            <dd className="mt-0.5 text-fg">{intervalLabel}</dd>
          </div>
        </dl>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-2">
            {client.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-agency-brand-border/50 bg-agency-brand-soft/40 px-2.5 py-0.5 font-sans text-[11px] font-medium text-agency-brand"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(client.servicesActive ?? []).map((id) => {
              const dep = DEPARTMENTS.find((d) => d.id === id);
              const label = dep?.short ?? id.toUpperCase();
              return (
                <span
                  key={id}
                  title={dep?.name ?? id}
                  className={cn(
                    "rounded-md border border-border bg-surface-muted px-2 py-0.5",
                    "text-[10px] font-medium uppercase tracking-wide text-fg-muted",
                  )}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
