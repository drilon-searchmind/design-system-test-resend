"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { routes } from "@/config/routes";

/**
 * @param {{
 *   contractId: string;
 *   accountStatus?: string;
 *   signingState?: string;
 *   onDone?: () => void;
 * }} props
 */
export function ContractDetailActions({
  contractId,
  accountStatus,
  signingState,
  onDone,
}) {
  const dataSource = useDataSource();
  const router = useRouter();
  const [busy, setBusy] = useState(/** @type {string | null} */ (null));
  const [msg, setMsg] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const runAction = useCallback(
    async (action) => {
      if (dataSource === "demo") {
        setError("Skift til database-kilde");
        return;
      }
      setBusy(action);
      setError(null);
      setMsg(null);
      try {
        const qs = databaseApiQuery();
        if (action === "resend") {
          const res = await fetch(`/api/contracts/send?${qs}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contractId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? "Kunne ikke sende");
          setMsg(
            `Sendt til ${data.signerEmail ?? "kunden"}${
              data.debugAccessCode ? ` (dev-kode: ${data.debugAccessCode})` : ""
            }`,
          );
          onDone?.();
          return;
        }

        const res = await fetch(
          `/api/contracts/${encodeURIComponent(contractId)}/actions?${qs}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Handling fejlede");

        if (action === "renew" && data.contractKey) {
          setMsg("Ny version oprettet — send til genunderskrift");
          router.push(`${routes.contracts}/${encodeURIComponent(data.contractKey)}`);
          return;
        }

        setMsg(
          action === "pause" ? "Sat i pause"
          : action === "close" ? "Afsluttet"
          : action === "activate" ? "Aktiveret"
          : "Opdateret",
        );
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fejl");
      } finally {
        setBusy(null);
      }
    },
    [contractId, dataSource, onDone, router],
  );

  const btn =
    "rounded-lg border border-border bg-surface-muted px-3 py-1.5 font-sans text-[11px] font-medium text-fg transition hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand disabled:opacity-50";
  const btnPrimary =
    "rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 py-1.5 font-sans text-[11px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80 disabled:opacity-50";

  return (
    <div className="flex max-w-sm flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        {(accountStatus === "pending_signature" || signingState === "pending" || signingState === "unsigned") ?
          <button
            type="button"
            className={btnPrimary}
            disabled={Boolean(busy)}
            onClick={() => void runAction("resend")}
          >
            {busy === "resend" ? "Sender…" : "Send til underskrift"}
          </button>
        : null}
        {accountStatus === "active" || accountStatus === "notice" ?
          <button
            type="button"
            className={btn}
            disabled={Boolean(busy)}
            onClick={() => void runAction("pause")}
          >
            Pause
          </button>
        : null}
        {accountStatus === "paused" && signingState === "signed" ?
          <button
            type="button"
            className={btn}
            disabled={Boolean(busy)}
            onClick={() => void runAction("activate")}
          >
            Genaktiver
          </button>
        : null}
        {accountStatus !== "inactive" ?
          <button
            type="button"
            className={btn}
            disabled={Boolean(busy)}
            onClick={() => void runAction("close")}
          >
            Afslut
          </button>
        : null}
        {signingState === "signed" || accountStatus === "active" || accountStatus === "inactive" ?
          <button
            type="button"
            className={btnPrimary}
            disabled={Boolean(busy)}
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  "Fornyelse opretter en ny kontraktversion. Den gamle afsluttes, og kunden skal underskrive igen. Fortsæt?",
                )
              ) {
                return;
              }
              void runAction("renew");
            }}
          >
            {busy === "renew" ? "Fornyer…" : "Forny (kræver ny underskrift)"}
          </button>
        : null}
      </div>
      {msg ? <p className="text-right font-sans text-[11px] text-agency-ok">{msg}</p> : null}
      {error ? <p className="text-right font-sans text-[11px] text-agency-bad">{error}</p> : null}
    </div>
  );
}
