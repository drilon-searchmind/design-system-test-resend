"use client";

import { useEffect, useState } from "react";

import {
  AGENCY_SETTING_FIELDS,
  DEFAULT_AGENCY_SETTINGS,
  validateAgencySettings,
} from "@/lib/crm/agency-settings";

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-canvas px-3 py-2 text-[13px] tabular-nums text-fg";

const GROUPS = [
  {
    id: "profitability",
    title: "Rentabilitet pr. afdeling",
    sub: "Bruges i Pulse → Rentabilitet per afdeling.",
  },
  {
    id: "health",
    title: "Kundesundhed (score)",
    sub: "Score 0–100 ud fra Indeks, NPS og tid brugt ift. retainer. Bruges i Top sunde/usunde kunder.",
  },
  {
    id: "lists",
    title: "Lister",
    sub: "Hvor mange kunder Pulse viser i Top-listerne.",
  },
];

/** Admin: justér de beregningsparametre der ellers var faste tal i koden. */
export function SettingsAgencySection() {
  const [values, setValues] = useState(
    /** @type {Record<string, string>} */ (
      Object.fromEntries(
        Object.entries(DEFAULT_AGENCY_SETTINGS).map(([k, v]) => [k, String(v)]),
      )
    ),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(/** @type {{ ok: boolean; text: string } | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings/agency", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data.settings) {
          setValues(
            Object.fromEntries(Object.entries(data.settings).map(([k, v]) => [k, String(v)])),
          );
        }
      } catch {
        /* behold standardværdier */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** @param {Record<string, unknown>} settings */
  function applySettings(settings) {
    setValues(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)])));
  }

  async function save() {
    const local = validateAgencySettings(values);
    if ("error" in local) {
      setMessage({ ok: false, text: local.error });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local.settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke gemme");
      applySettings(data.settings);
      setMessage({ ok: true, text: "Gemt. Pulse bruger de nye værdier ved næste indlæsning." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fejl" });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Nulstil alle beregningsparametre til standardværdierne?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/agency", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke nulstille");
      applySettings(data.settings);
      setMessage({ ok: true, text: "Nulstillet til standardværdier." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Fejl" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-sans text-base font-semibold text-fg">Beregninger</h2>
        <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
          Tal der styrer nøgletal og lister i Pulse. Ændringer gemmes i databasen og gælder for hele
          workspacet (database-kilden). Eksempeldata bruger altid standardværdierne.
        </p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.id} className="tally-panel p-5 md:p-6">
          <h3 className="font-sans text-[14px] font-semibold text-fg">{g.title}</h3>
          <p className="mt-1 font-sans text-[12px] text-fg-muted">{g.sub}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {AGENCY_SETTING_FIELDS.filter((f) => f.group === g.id).map((f) => (
              <label key={f.key} className="block font-sans text-[12px] font-medium text-fg-muted">
                {f.label}
                {f.unit ? <span className="ml-1 font-normal text-fg-quiet">({f.unit})</span> : null}
                <input
                  type="number"
                  inputMode="decimal"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  disabled={loading || busy}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((cur) => ({ ...cur, [f.key]: e.target.value }))}
                  className={`mt-1.5 ${INPUT_CLASS}`}
                />
                <span className="mt-1 block text-[11px] font-normal leading-snug text-fg-quiet">
                  {f.hint} Standard: {DEFAULT_AGENCY_SETTINGS[f.key].toLocaleString("da-DK")}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      {message ?
        <p className={`font-sans text-[12px] ${message.ok ? "text-agency-ok" : "text-agency-bad"}`}>
          {message.text}
        </p>
      : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void save()}
          className="rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2 font-sans text-[12px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80 disabled:opacity-50"
        >
          {busy ? "Gemmer…" : "Gem"}
        </button>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void reset()}
          className="rounded-lg border border-border px-4 py-2 font-sans text-[12px] font-medium text-fg disabled:opacity-50"
        >
          Nulstil til standard
        </button>
      </div>
    </div>
  );
}
