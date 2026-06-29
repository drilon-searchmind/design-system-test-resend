"use client";

import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   client: {
 *     id: string;
 *     name: string;
 *     industry: string;
 *     logo: string;
 *     hue: number;
 *     status: 'active' | 'paused' | 'inactive';
 *     health: 'ok' | 'warn' | 'bad';
 *     lastActivity: string;
 *   };
 *   owner: { name: string; role: string; avatar: string; hue: number } | null;
 *   trailing?: import('react').ReactNode;
 * }} props
 */
export function ClientDetailHeader({ client, owner, trailing }) {
  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link
          href={routes.clients}
          className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
        >
          Kunder
        </Link>
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-fg">{client.name}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border",
              "text-sm font-semibold text-white md:size-[60px] md:text-[15px]",
            )}
            style={{
              background: `linear-gradient(135deg, oklch(62% 0.15 ${client.hue}), oklch(52% 0.18 ${client.hue + 28}))`,
            }}
          >
            {client.logo}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              Kunde
            </p>
            <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">{client.name}</h1>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {client.industry}
              {owner ? (
                <>
                  {" "}
                  · Account:{" "}
                  <span className="inline-flex items-center gap-1.5 text-fg">
                    <CrmAvatar label={owner.avatar} hue={owner.hue} className="size-5 text-[9px]" />
                    <span>
                      {owner.name}
                      <span className="text-fg-muted"> ({owner.role})</span>
                    </span>
                  </span>
                </>
              ) : null}
              {" · "}
              <span className="text-[12px] tabular-nums text-fg-quiet">
                Sidst aktiv {client.lastActivity}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip status={client.status} palette="agency" />
              <HealthChip health={client.health} palette="agency" />
            </div>
          </div>
        </div>

        {trailing ? <div className="flex flex-wrap items-start justify-end gap-2">{trailing}</div> : null}
      </header>
    </>
  );
}
