import { CrmAvatar } from "@/components/crm/crm-avatar";
import { ClientDetailDomainsCard } from "@/components/clients/client-detail-domains-card";
import { DEPARTMENTS, TEAM } from "@/lib/crm/static-data";
import { computeClv, computeLifetimeMonths } from "@/lib/crm/client-utils";
import { domainsForClient } from "@/lib/crm/domains-data";
import { formatCurrency } from "@/lib/crm/format-da";
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

  const lifetimeMonths = computeLifetimeMonths(client);
  const clv = client.clv ?? computeClv(client);
  const domains = client.domains ?? domainsForClient(client.id);
  const services = client.servicesActive ?? [];

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
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
            <div>
              <dt className="text-fg-soft">Levetid</dt>
              <dd className="mt-0.5 tabular-nums text-fg">{lifetimeMonths} md.</dd>
            </div>
            <div>
              <dt className="text-fg-soft">CLV</dt>
              <dd className="mt-0.5 tabular-nums text-fg">
                {formatCurrency(clv, client.currency)}
              </dd>
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
              {services.map((id) => {
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

        {services.length > 0 && client.deptAssignees ? (
          <div className="mt-4 border-t border-border-soft pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Ansvarlige pr. disciplin
            </p>
            <ul className="mt-2 flex flex-wrap gap-3">
              {services.map((deptId) => {
                const memberId = client.deptAssignees?.[deptId];
                const member = memberId ? TEAM.find((t) => t.id === memberId) : null;
                const dep = DEPARTMENTS.find((d) => d.id === deptId);
                const assigneeLabel = member?.name ?? memberId;
                return (
                  <li key={deptId} className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-fg-quiet">
                      {dep?.short ?? deptId}
                    </span>
                    {assigneeLabel ? (
                      <span className="inline-flex items-center gap-1.5 font-sans text-[12px] text-fg-muted">
                        {member ? (
                          <CrmAvatar label={member.avatar} src={member.image} hue={member.hue} className="size-5 text-[9px]" />
                        ) : null}
                        {assigneeLabel}
                      </span>
                    ) : (
                      <span className="text-[12px] text-fg-quiet">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <ClientDetailDomainsCard domains={domains} />
    </div>
  );
}
