"use client";

import { StickyPageHeader } from "@/components/crm/sticky-page-header";
import Link from "next/link";

import { ClientLogo } from "@/components/clients/client-logo";
import { LastActivityValue } from "@/components/clients/client-metric-cells";
import { patchClient, QuickEditPopover } from "@/components/clients/client-quick-edit";
import { CrmAvatar } from "@/components/crm/crm-avatar";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { routes } from "@/config/routes";
import { clientGroupHref } from "@/lib/crm/client-groups";
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

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pause" },
  { value: "inactive", label: "Inaktiv" },
];

const HEALTH_OPTIONS = [
  { value: "ok", label: "Sund" },
  { value: "warn", label: "Advarsel" },
  { value: "bad", label: "Kritisk" },
];

/**
 * @param {{
 *   client: import('@/lib/crm/static-data').CLIENTS[number];
 *   owner: { name: string; role: string; avatar: string; hue: number; image?: string } | null;
 *   trailing?: import('react').ReactNode;
 *   group?: { cvr: string; name: string; href?: string } | null;
 *   latestActivity?: import('@/lib/crm/client-activity').ClientActivity | null;
 *   fallbackDomains?: Array<{ domain?: string; isPrimary?: boolean }>;
 *   team?: Array<{ id: string; name: string }>;
 *   canEdit?: boolean;
 *   isAdmin?: boolean;
 *   onClientChanged?: () => void;
 * }} props `canEdit` = kundeansvarlig kan redigeres inline; status/sundhed kræver også `isAdmin`.
 */
export function ClientDetailHeader({
  client,
  owner,
  trailing,
  group = null,
  latestActivity,
  fallbackDomains,
  team = [],
  canEdit = false,
  isAdmin = false,
  onClientChanged,
}) {
  const showChurn = client.status === "inactive" && client.terminatedAt;
  const canEditOwner = canEdit && team.length > 0;
  const canEditAdmin = canEdit && isAdmin;
  /** @param {Record<string, unknown>} patch */
  const saveField = async (patch) => {
    await patchClient(client.id, patch);
    onClientChanged?.();
  };

  return (
    <>
      <nav aria-label="Brødkrummer" className="font-sans text-[13px] text-fg-muted">
        <Link
          href={routes.clients}
          className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
        >
          Kunder
        </Link>
        {group ?
          <>
            <span className="mx-2 text-fg-quiet">/</span>
            <Link
              href={group.href ?? clientGroupHref(group.cvr)}
              className="text-fg-muted transition-colors hover:text-agency-brand hover:underline"
            >
              {group.name}
            </Link>
          </>
        : null}
        <span className="mx-2 text-fg-quiet">/</span>
        <span className="text-fg">{client.name}</span>
      </nav>

      <StickyPageHeader className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <ClientLogo
            client={client}
            fallbackDomains={fallbackDomains}
            className="sph-hide size-14 rounded-xl text-sm md:size-[60px] md:text-[15px]"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {client.isGroup ? `Kundegruppe · ${client.groupSize} brands` : "Kunde"}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg">
                {client.name}
              </h1>
              {client.cvr || client.cvrs?.length ? (
                <span className="font-sans text-[11px] tabular-nums text-fg-quiet">
                  CVR {client.cvr ?? client.cvrs.join(", ")}
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
            <div className="sph-hide mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
              {client.isGroup ? (client.brands ?? []).map((b) => b.name).join(" · ") : client.industry}
              {owner || canEditOwner ? (
                <>
                  {" "}
                  · Kundeansvarlig:{" "}
                  <QuickEditPopover
                    title="Kundeansvarlig"
                    canEdit={canEditOwner}
                    className="align-middle"
                    fields={[
                      {
                        name: "ownerMemberKey",
                        label: "Teammedlem",
                        type: "select",
                        options: [{ value: "", label: "— Ingen —" }, ...team.map((m) => ({ value: m.id, label: m.name }))],
                      },
                    ]}
                    initialValues={{ ownerMemberKey: client.owner ?? "" }}
                    onSubmit={(v) => saveField({ ownerMemberKey: v.ownerMemberKey || null })}
                    onRemove={owner ? () => saveField({ ownerMemberKey: null }) : undefined}
                  >
                    {owner ?
                      <span className="inline-flex items-center gap-1.5 px-0.5 text-fg">
                        <CrmAvatar label={owner.avatar} src={owner.image} hue={owner.hue} className="size-5 text-[9px]" />
                        <span>
                          {owner.name}
                          {owner.role ? <span className="text-fg-muted"> ({owner.role})</span> : null}
                        </span>
                      </span>
                    : <span className="px-1 text-agency-brand">+ Tildel</span>}
                  </QuickEditPopover>
                </>
              ) : null}
              {" · "}
              <span className="text-[12px] tabular-nums text-fg-quiet">
                Seneste aktivitet{" "}
                <LastActivityValue activity={latestActivity} fallback={client.lastActivity} />
              </span>
            </div>
            <div className="sph-hide mt-3 flex flex-wrap items-center gap-2">
              <QuickEditPopover
                title="Status"
                canEdit={canEditAdmin}
                fields={[{ name: "status", label: "Status", type: "select", options: STATUS_OPTIONS }]}
                initialValues={{ status: client.status }}
                onSubmit={(v) => saveField({ status: v.status })}
              >
                <StatusChip status={client.status} palette="agency" />
              </QuickEditPopover>
              <QuickEditPopover
                title="Sundhed"
                canEdit={canEditAdmin}
                fields={[{ name: "health", label: "Sundhed", type: "select", options: HEALTH_OPTIONS }]}
                initialValues={{ health: client.health }}
                onSubmit={(v) => saveField({ health: v.health })}
              >
                <HealthChip health={client.health} palette="agency" />
              </QuickEditPopover>
              {group ?
                <Link
                  href={group.href ?? clientGroupHref(group.cvr)}
                  className="inline-flex items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2.5 py-0.5 font-sans text-[11px] font-medium text-agency-brand hover:underline"
                >
                  Del af kundegruppe: {group.name}
                </Link>
              : null}
            </div>

            {showChurn ? (
              <div className="sph-hide mt-3 space-y-2">
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
      </StickyPageHeader>
    </>
  );
}
