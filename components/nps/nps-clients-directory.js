"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import {
  PulseIconChevronDown,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseSparkline } from "@/components/pulse/pulse-sparkline";
import { routes } from "@/config/routes";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { HealthChip } from "@/components/crm/health-chip";
import { StatusChip } from "@/components/crm/status-chip";
import { NPS_INTERVAL_DA } from "@/lib/crm/nps-intervals-da";
import { isNpsSendEnabled, resolveNpsRecipient } from "@/lib/crm/nps-recipient";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { npsLatestEntry, npsPreviousEntry } from "@/lib/crm/nps-utils";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(128px,1.25fr)_minmax(48px,0.36fr)_minmax(48px,0.36fr)_minmax(40px,0.3fr)_minmax(112px,0.9fr)_minmax(88px,0.7fr)_minmax(68px,0.48fr)_minmax(140px,1fr)_minmax(148px,1fr)]";

const NPS_RECIPIENT_HINT_TITLE = "Hvor sættes NPS-e-mail?";
const NPS_RECIPIENT_HINT_BODY = (
  <>
    <p>
      NPS sendes til <span className="font-medium text-fg">primær kontakt</span> på kundekortet. Der kan ikke
      tildeles en separat NPS-adresse her.
    </p>
    <p className="mt-2">
      Gå til <span className="font-medium text-fg">Kunder</span> → åbn kunden →{" "}
      <span className="font-medium text-fg">Rediger</span> → udfyld{" "}
      <span className="font-medium text-fg">Primær kontakt</span> (navn + e-mail).
    </p>
  </>
);

function scoreToneClass(s) {
  if (s == null) return "text-fg-quiet";
  if (s >= 50) return "text-agency-ok";
  if (s >= 40) return "text-agency-warn";
  return "text-agency-bad";
}

function NpsRecipientInfoIcon({ className }) {
  return (
    <CrmHoverPopover
      align="start"
      title={NPS_RECIPIENT_HINT_TITLE}
      content={<div className="font-sans text-[12px] leading-snug text-fg-muted">{NPS_RECIPIENT_HINT_BODY}</div>}
      triggerClassName={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted font-sans text-[11px] font-semibold leading-none text-fg-muted hover:border-agency-brand-border hover:text-agency-brand",
        className,
      )}
    >
      <span aria-hidden>i</span>
      <span className="sr-only">Hjælp om NPS-modtager</span>
    </CrmHoverPopover>
  );
}

/**
 * @param {{
 *   email: string | null | undefined;
 *   clientId: string;
 *   clientName: string;
 * }} props
 */
function NpsRecipientEmail({ email, clientId, clientName }) {
  const hasEmail = Boolean(email?.trim());

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <div className="min-w-0 flex-1">
        {hasEmail ?
          <span className="block truncate font-sans text-[11px] font-medium text-fg" title={email ?? ""}>
            {email}
          </span>
        : <Link
            href={`${routes.clients}/${clientId}`}
            className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
          >
            Mangler e-mail
          </Link>
        }
        {!hasEmail ?
          <span className="mt-0.5 block text-[10px] text-fg-quiet">Tilføj primær kontakt på kundekort</span>
        : null}
      </div>
      <NpsRecipientInfoIcon className={!hasEmail ? "mt-0.5 text-agency-brand" : undefined} />
      <span className="sr-only">Modtager for {clientName}</span>
    </div>
  );
}

/**
 * @param {{
 *   clients: import('@/lib/crm/static-data').CLIENTS;
 *   templates?: { id: string; name: string; isDefault?: boolean }[];
 *   onMutate?: () => void;
 *   canSend?: boolean;
 *   headingId?: string;
 * }} props
 */
export function NpsClientsDirectory({
  clients,
  templates = [],
  onMutate,
  canSend = false,
  headingId = "nps-clients-directory",
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [density, setDensity] = useState("list");
  const [sendingId, setSendingId] = useState(/** @type {string | null} */ (null));
  const [assigningId, setAssigningId] = useState(/** @type {string | null} */ (null));
  const [settingsId, setSettingsId] = useState(/** @type {string | null} */ (null));
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null));

  const defaultTemplateId = templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? "";

  const patchSendEnabled = useCallback(
    async (clientId, enabled) => {
      if (!canSend) return;
      setSettingsId(clientId);
      setActionError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/nps/clients/${encodeURIComponent(clientId)}/settings?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ npsSendEnabled: enabled }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");
        onMutate?.();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Fejl ved indstillinger");
      } finally {
        setSettingsId(null);
      }
    },
    [canSend, onMutate],
  );

  const sendNps = useCallback(
    async (clientId) => {
      if (!canSend) return;
      setSendingId(clientId);
      setActionError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/nps/send?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientSlug: clientId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Send fejlede");
        onMutate?.();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Fejl ved send");
      } finally {
        setSendingId(null);
      }
    },
    [canSend, onMutate],
  );

  const assignTemplate = useCallback(
    async (clientId, templateKey) => {
      if (!canSend) return;
      setAssigningId(clientId);
      setActionError(null);
      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/nps/clients/${encodeURIComponent(clientId)}/template?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateKey: templateKey || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke tildele");
        onMutate?.();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Fejl ved tildeling");
      } finally {
        setAssigningId(null);
      }
    },
    [canSend, onMutate],
  );

  const rows = useMemo(() => {
    return clients.map((c) => {
      const latest = npsLatestEntry(c);
      const prev = npsPreviousEntry(c);
      const delta = latest && prev ? latest.score - prev.score : null;
      const spark = (c.npsHistory ?? []).map((e) => e.score);
      const intervalKey = c.npsInterval;
      const cadence =
        intervalKey && intervalKey in NPS_INTERVAL_DA
          ? NPS_INTERVAL_DA[/** @type {keyof typeof NPS_INTERVAL_DA} */ (intervalKey)]
          : c.npsInterval ?? "—";
      const templateId = /** @type {{ npsTemplateId?: string | null }} */ (c).npsTemplateId ?? null;
      const atRisk = latest != null && latest.score < 40;
      const improving = delta != null && delta >= 2;
      const noData = !latest;
      const recipient = resolveNpsRecipient(/** @type {import('@/lib/crm/nps-recipient').NpsRecipientClientShape} */ (c));
      const sendEnabled = isNpsSendEnabled(/** @type {import('@/lib/crm/nps-recipient').NpsRecipientClientShape} */ (c));

      return {
        client: c,
        latest,
        delta,
        spark,
        cadence,
        atRisk,
        improving,
        noData,
        templateId,
        recipient,
        sendEnabled,
      };
    });
  }, [clients]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      const ql = q.trim().toLowerCase();
      if (
        ql &&
        !r.client.name.toLowerCase().includes(ql) &&
        !r.client.industry.toLowerCase().includes(ql) &&
        !r.cadence.toLowerCase().includes(ql) &&
        !(r.recipient?.email ?? "").toLowerCase().includes(ql)
      ) {
        return false;
      }
      if (filter === "atRisk" && !r.atRisk) return false;
      if (filter === "improving" && !r.improving) return false;
      if (filter === "noData" && !r.noData) return false;
      if (filter === "pausedSend" && r.sendEnabled) return false;
      if (filter === "noEmail" && r.recipient?.email) return false;
      return true;
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "score") {
        const as = a.latest?.score ?? -1;
        const bs = b.latest?.score ?? -1;
        return bs - as;
      }
      if (sort === "delta") {
        const ad = a.delta ?? -999;
        const bd = b.delta ?? -999;
        return bd - ad;
      }
      return a.client.name.localeCompare(b.client.name, "da");
    });
    return list;
  }, [rows, q, filter, sort]);

  return (
    <section className="tally-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <div>
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            Konti · NPS-oversigt
          </h2>
          <p className="mt-1 font-sans text-[11px] text-fg-muted">
            Aktiv + pauseret — NPS-modtager er primær kontakt på kundekortet.
          </p>
        </div>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} vist
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[200px] flex-1 md:max-w-[260px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg konto eller e-mail…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <PulseSegmentedControl
            size="sm"
            active={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "atRisk", label: "< 40" },
              { id: "improving", label: "+2" },
              { id: "noData", label: "Ingen måling" },
              { id: "noEmail", label: "Mangler e-mail" },
              ...(canSend ? [{ id: "pausedSend", label: "Send fra" }] : []),
            ]}
          />

          <PulseSegmentedControl
            size="sm"
            active={density}
            onChange={setDensity}
            tabs={[
              { id: "list", label: "", icon: () => <PulseIconList size={12} /> },
              { id: "cards", label: "", icon: () => <PulseIconGrid size={12} /> },
            ]}
          />
        </div>
      </div>

      {actionError ?
        <p className="border-b border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad">
          {actionError}
        </p>
      : null}

      {density === "cards" ?
        <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {filtered.map((r) => (
            <article
              key={r.client.id}
              className={cn(
                "flex flex-col rounded-2xl border border-border-soft bg-surface-muted/35 p-3.5",
                r.atRisk && "border-agency-bad-border/35",
                !r.sendEnabled && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`${routes.clients}/${r.client.id}`}
                  className="font-sans text-[14px] font-semibold text-fg hover:text-agency-brand hover:underline"
                >
                  {r.client.name}
                </Link>
                <HealthChip health={r.client.health} palette="agency" compact />
              </div>
              <div className="mt-2">
                <NpsRecipientEmail
                  email={r.recipient?.email}
                  clientId={r.client.id}
                  clientName={r.client.name}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusChip status={r.client.status} palette="agency" />
              </div>
              <p className="mt-2 font-sans text-[11px] text-fg-muted">{r.cadence}</p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className={cn("text-[26px] font-semibold tabular-nums leading-none", scoreToneClass(r.latest?.score ?? null))}>
                  {r.latest?.score ?? "—"}
                </span>
                {r.delta != null ?
                  <span className={cn("text-[12px] tabular-nums", r.delta >= 0 ? "text-agency-ok" : "text-agency-bad")}>
                    {r.delta > 0 ? "+" : ""}
                    {r.delta} vs sidst
                  </span>
                : null}
              </div>
              {r.spark.length > 2 ?
                <div className="mt-2 text-agency-brand">
                  <PulseSparkline data={r.spark} height={34} />
                </div>
              : <p className="mt-2 text-[10px] text-fg-quiet">For få punkter til graf</p>}
              {canSend ?
                <NpsRowActions
                  row={r}
                  defaultTemplateId={defaultTemplateId}
                  templates={templates}
                  onToggleSend={(enabled) => void patchSendEnabled(r.client.id, enabled)}
                  onAssignTemplate={(key) => void assignTemplate(r.client.id, key)}
                  onSend={() => void sendNps(r.client.id)}
                  sending={sendingId === r.client.id}
                  assigning={assigningId === r.client.id}
                  savingSettings={settingsId === r.client.id}
                  variant="card"
                />
              : null}
            </article>
          ))}
        </div>
      : <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div
              className={cn(
                "grid gap-2 border-b border-border bg-surface-muted/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button type="button" className="text-left font-[inherit] hover:text-fg" onClick={() => setSort("name")}>
                Konto {sort === "name" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button type="button" className="text-left font-[inherit] hover:text-fg" onClick={() => setSort("score")}>
                Score {sort === "score" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Δ</span>
              <span className="text-center">H</span>
              <span>Trend</span>
              <span>Cyklus</span>
              <span className="text-center">Drift</span>
              <span className="inline-flex items-center gap-1">
                NPS-modtager
                <NpsRecipientInfoIcon />
              </span>
              {canSend ? <span>Handling</span> : null}
            </div>
            {filtered.map((r, i) => (
              <div
                key={r.client.id}
                className={cn(
                  "grid gap-2 border-b border-border-soft px-3 py-2 md:gap-3 md:px-4 md:py-2.5",
                  GRID,
                  i === filtered.length - 1 && "border-b-0",
                  r.atRisk && "bg-agency-bad-soft/12",
                  r.noData && "opacity-85",
                  !r.sendEnabled && "opacity-55",
                )}
              >
                <div className="min-w-0">
                  <Link
                    href={`${routes.clients}/${r.client.id}`}
                    className="truncate font-sans text-[12px] font-semibold leading-snug text-fg hover:text-agency-brand hover:underline"
                  >
                    {r.client.name}
                  </Link>
                  <span className="block text-[10px] text-fg-quiet">{r.client.industry}</span>
                </div>
                <span className={cn("text-[13px] font-semibold tabular-nums", scoreToneClass(r.latest?.score ?? null))}>
                  {r.latest?.score ?? "—"}
                </span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    r.delta == null ? "text-fg-quiet" : r.delta >= 0 ? "text-agency-ok" : "text-agency-bad",
                  )}
                >
                  {r.delta == null ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta}`}
                </span>
                <div className="flex justify-center">
                  <HealthChip health={r.client.health} palette="agency" compact />
                </div>
                <div className="flex min-h-[34px] items-center text-agency-brand">
                  {r.spark.length > 2 ?
                    <PulseSparkline data={r.spark} height={28} />
                  : <span className="text-[10px] text-fg-quiet">—</span>}
                </div>
                <p className="line-clamp-2 font-sans text-[11px] leading-snug text-fg-muted">{r.cadence}</p>
                <StatusChip status={r.client.status} palette="agency" />
                <NpsRecipientEmail
                  email={r.recipient?.email}
                  clientId={r.client.id}
                  clientName={r.client.name}
                />
                {canSend ?
                  <NpsRowActions
                    row={r}
                    defaultTemplateId={defaultTemplateId}
                    templates={templates}
                    onToggleSend={(enabled) => void patchSendEnabled(r.client.id, enabled)}
                    onAssignTemplate={(key) => void assignTemplate(r.client.id, key)}
                    onSend={() => void sendNps(r.client.id)}
                    sending={sendingId === r.client.id}
                    assigning={assigningId === r.client.id}
                    savingSettings={settingsId === r.client.id}
                    variant="list"
                  />
                : null}
              </div>
            ))}
          </div>
        </div>
      }
    </section>
  );
}

/**
 * @param {{
 *   row: {
 *     client: { id: string; name: string };
 *     templateId: string | null;
 *     sendEnabled: boolean;
 *     recipient: { email: string } | null;
 *   };
 *   defaultTemplateId: string;
 *   templates: { id: string; name: string }[];
 *   onToggleSend: (enabled: boolean) => void;
 *   onAssignTemplate: (key: string) => void;
 *   onSend: () => void;
 *   sending?: boolean;
 *   assigning?: boolean;
 *   savingSettings?: boolean;
 *   variant: "list" | "card";
 * }} props
 */
function NpsRowActions({
  row,
  defaultTemplateId,
  templates,
  onToggleSend,
  onAssignTemplate,
  onSend,
  sending = false,
  assigning = false,
  savingSettings = false,
  variant,
}) {
  const canSendNow = row.sendEnabled && Boolean(row.recipient?.email);

  if (variant === "card") {
    return (
      <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3">
        <label className="flex items-center gap-2 font-sans text-[11px] text-fg-muted">
          <input
            type="checkbox"
            checked={row.sendEnabled}
            disabled={savingSettings}
            onChange={(e) => onToggleSend(e.target.checked)}
            className="size-3.5 rounded border-border"
          />
          NPS-udsendelse aktiv
        </label>
        <select
          value={row.templateId ?? ""}
          disabled={assigning}
          onChange={(e) => onAssignTemplate(e.target.value)}
          className="h-7 w-full rounded-md border border-border bg-surface-muted px-1.5 font-sans text-[10px] text-fg"
        >
          <option value="">Standard ({defaultTemplateId || "—"})</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={sending || !canSendNow}
          onClick={onSend}
          className="w-full rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5 font-sans text-[11px] font-medium text-agency-brand disabled:opacity-50"
        >
          {sending ? "Sender…" : row.sendEnabled ? "Send NPS" : "Send deaktiveret"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 font-sans text-[10px] text-fg-muted">
        <input
          type="checkbox"
          checked={row.sendEnabled}
          disabled={savingSettings}
          onChange={(e) => onToggleSend(e.target.checked)}
          className="size-3 rounded border-border"
        />
        Send aktiv
      </label>
      <select
        value={row.templateId ?? ""}
        disabled={assigning}
        onChange={(e) => onAssignTemplate(e.target.value)}
        className="h-7 w-full min-w-0 rounded-md border border-border bg-surface-muted px-1.5 font-sans text-[10px] text-fg"
        aria-label={`Skabelon for ${row.client.name}`}
      >
        <option value="">Standard ({defaultTemplateId || "—"})</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={sending || !canSendNow}
        onClick={onSend}
        className="rounded-md border border-agency-brand-border bg-agency-brand-soft px-2 py-1 font-sans text-[10px] font-medium text-agency-brand disabled:opacity-50"
      >
        {sending ? "Sender…" : "Send NPS"}
      </button>
    </div>
  );
}
