"use client";

import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { routes } from "@/config/routes";
import { CHURN_REASON_LABELS } from "@/lib/crm/client-utils";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { cn } from "@/lib/utils";

function ExternalLinkIcon({ className }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 2.5H11.5V4.5M6 8L11.5 2.5M5 2.5H2.5V11.5H11.5V9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   owner: { name: string; role: string; avatar: string; hue: number } | null;
 *   trailing?: import('react').ReactNode;
 * }} props
 */
export function ClientDetailHeader({ client, owner, trailing }) {
  const showChurn = client.status === "inactive" && client.terminatedAt;

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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">
                {client.name}
              </h1>
              {client.cvr ? (
                <span className="font-sans text-[11px] tabular-nums text-fg-quiet">
                  CVR {client.cvr}
                </span>
              ) : null}
              {client.googleDriveUrl ? (
                <a
                  href={client.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5",
                    "text-[11px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:text-agency-brand",
                  )}
                  title="Åbn Google Drive"
                >
                  <ExternalLinkIcon />
                  <span className="sr-only">Google Drive</span>
                </a>
              ) : null}
            </div>
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {client.industry}
              {owner ? (
                <>
                  {" "}
                  · Account:{" "}
                  <span className="inline-flex items-center gap-1.5 text-fg">
                    <CrmAvatar label={owner.avatar} src={owner.image} hue={owner.hue} className="size-5 text-[9px]" />
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

            {showChurn ? (
              <div className="mt-3 space-y-2">
                <p className="font-sans text-[12px] text-fg-muted">
                  Opsagt{" "}
                  <span className="tabular-nums text-fg">
                    {formatIsoDateDa(client.terminatedAt)}
                  </span>
                </p>
                {client.churnReason?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {client.churnReason.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-fg-muted"
                      >
                        {CHURN_REASON_LABELS[reason] ?? reason}
                      </span>
                    ))}
                  </div>
                ) : null}
                {client.churnNote ? (
                  <p className="max-w-prose font-sans text-[12px] leading-relaxed text-fg-quiet">
                    {client.churnNote}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {trailing ? <div className="flex flex-wrap items-start justify-end gap-2">{trailing}</div> : null}
      </header>
    </>
  );
}
