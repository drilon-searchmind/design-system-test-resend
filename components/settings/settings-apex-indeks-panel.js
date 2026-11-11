"use client";

import { useCallback, useEffect, useState } from "react";

/** Admin: status og manuel synkronisering af Indeks fra Apex. */
export function SettingsApexIndeksPanel() {
  const [status, setStatus] = useState(
    /** @type {{ configured: boolean; lastFetchedAt: string | null; clientsWithClickUpId: number; clientsWithIndeks: number } | null} */ (null),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(/** @type {{ ok: boolean; text: string } | null} */ (null));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/apex-indeks", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignorer */
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/apex-indeks", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Synkronisering fejlede");
      const s = Object.entries(data.statusCounts ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      setMessage({
        ok: true,
        text: `Hentet ${data.fetched} kunder fra Apex, ${data.matched} matchet på ClickUp-id (${data.unmatched} uden match). ${s}`,
      });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fejl" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tally-panel p-5 md:p-6">
      <h3 className="font-sans text-[14px] font-semibold text-fg">Indeks fra Apex</h3>
      <p className="mt-1 font-sans text-[12px] text-fg-muted">
        Apex YoY (seneste 30 dage) hentes i ét kald og matches på kundens ClickUp-id. Kører også
        automatisk via cron.
      </p>
      <dl className="mt-3 grid gap-1 font-sans text-[12px] text-fg-muted">
        <div>
          Opsætning:{" "}
          {status ?
            status.configured ?
              <span className="text-agency-ok">APEX_BASE_URL og CRM_INDEKS_API_KEY er sat</span>
            : <span className="text-agency-bad">Mangler APEX_BASE_URL / CRM_INDEKS_API_KEY</span>
          : "…"}
        </div>
        <div>
          Sidst hentet:{" "}
          {status?.lastFetchedAt ? status.lastFetchedAt.replace("T", " ").slice(0, 16) + " UTC" : "aldrig"}
        </div>
        <div>
          Kunder med ClickUp-id: {status?.clientsWithClickUpId ?? "…"} · med Indeks:{" "}
          {status?.clientsWithIndeks ?? "…"}
        </div>
      </dl>
      {message ?
        <p className={`mt-3 font-sans text-[12px] ${message.ok ? "text-agency-ok" : "text-agency-bad"}`}>
          {message.text}
        </p>
      : null}
      <button
        type="button"
        disabled={busy || status?.configured === false}
        onClick={() => void sync()}
        className="mt-4 rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2 font-sans text-[12px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80 disabled:opacity-50"
      >
        {busy ? "Henter…" : "Synkroniser Indeks nu"}
      </button>
    </section>
  );
}