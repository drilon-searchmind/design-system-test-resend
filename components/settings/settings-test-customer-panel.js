"use client";

import { useCallback, useEffect, useState } from "react";

const COOKIE = "crm_include_test";

/** @returns {boolean} */
function readCookie() {
  return document.cookie.split("; ").some((c) => c === `${COOKIE}=1`);
}

/** @param {boolean} on */
function writeCookie(on) {
  document.cookie = on ?
      `${COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Testkunden: opret/genopret/slet (admin) og slå den til/fra i hele applikationen.
 * Når den er slået til, vises og tælles al testdata (isTest) som en rigtig kunde — MRR, Pulse, opgaver,
 * tid, kontrakter, NPS, kalender m.m.
 */
export function SettingsTestCustomerPanel() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState(
    /** @type {{ exists: boolean; name?: string; counts?: Record<string, number> } | null} */ (null),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(/** @type {{ ok: boolean; text: string } | null} */ (null));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/test-customer", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignorer */
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setEnabled(readCookie());
      void load();
    });
  }, [load]);

  function toggle() {
    const next = !enabled;
    writeCookie(next);
    setEnabled(next);
    // Genindlæs så alle sider henter data med/uden testkunden
    window.location.reload();
  }

  /** @param {"create" | "remove"} action */
  async function run(action) {
    if (
      action === "remove" &&
      !window.confirm("Slet testkunden og alle dens opgaver, kontrakter, opsalg og tidsregistreringer?")
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/test-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Handlingen fejlede");
      setStatus(data);
      setMessage({
        ok: true,
        text: action === "create" ? "Testkunden er oprettet med friske data." : "Testkunden er slettet.",
      });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fejl" });
    } finally {
      setBusy(false);
    }
  }

  const c = status?.counts;

  return (
    <section className="tally-panel p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-sans text-[14px] font-semibold text-fg">Testkunde</h3>
          <p className="mt-1 max-w-prose font-sans text-[12px] leading-relaxed text-fg-muted">
            En fiktiv kunde (&quot;Testkunde ApS&quot;) med MRR, opsalg, kontrakter, tildelte medarbejdere,
            opgaver, tid, NPS og noter. Slået <strong className="font-medium text-fg">til</strong> vises og
            tæller den som en rigtig kunde overalt (fx samlet MRR i Pulse). Slået{" "}
            <strong className="font-medium text-fg">fra</strong> er den skjult og tæller ingen steder.
            Indstillingen gælder kun i din browser.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Vis testkunde i hele applikationen"
          disabled={!status?.exists}
          onClick={toggle}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-40 ${
            enabled ? "border-agency-brand-border bg-agency-brand" : "border-border bg-surface-muted"
          }`}
        >
          <span
            className={`inline-block size-4 rounded-full bg-canvas shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <dl className="mt-3 grid gap-1 font-sans text-[12px] text-fg-muted">
        <div>
          Status:{" "}
          {status ?
            status.exists ?
              <span className="text-agency-ok">{status.name} findes i databasen</span>
            : <span className="text-fg-quiet">Ikke oprettet endnu</span>
          : "…"}
        </div>
        {c ?
          <div>
            {c.contacts} kontakter · {c.contracts} kontrakter · {c.upsells} opsalg · {c.tasks} opgaver ·{" "}
            {c.timeEntries} tidsregistreringer
          </div>
        : null}
        <div>
          Visning:{" "}
          <span className={enabled ? "text-agency-ok" : "text-fg-quiet"}>
            {enabled ? "Testkunden er TIL" : "Testkunden er FRA"}
          </span>
        </div>
      </dl>

      {message ?
        <p className={`mt-3 font-sans text-[12px] ${message.ok ? "text-agency-ok" : "text-agency-bad"}`}>
          {message.text}
        </p>
      : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("create")}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-muted px-4 font-sans text-[12px] font-semibold text-fg transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand disabled:opacity-50"
        >
          {busy ? "Arbejder…" : status?.exists ? "Genopret med friske data" : "Opret testkunde"}
        </button>
        {status?.exists ?
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("remove")}
            className="inline-flex h-9 items-center rounded-lg border border-border px-4 font-sans text-[12px] font-semibold text-agency-bad transition-colors hover:bg-agency-bad-soft disabled:opacity-50"
          >
            Slet testkunde
          </button>
        : null}
      </div>
    </section>
  );
}
