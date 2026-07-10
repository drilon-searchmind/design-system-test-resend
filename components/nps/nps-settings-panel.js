"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { daysInMonth } from "@/lib/nps/settings-utils";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "Marts" },
  { value: 4, label: "April" },
  { value: 5, label: "Maj" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

/**
 * @param {{
 *   settings: {
 *     autoSendEnabled: boolean;
 *     sendTimeLocal: string;
 *     sendDates: { month: number; day: number }[];
 *     nextOccurrences: { isoDate: string; label: string }[];
 *   } | null;
 *   onMutate?: () => void;
 *   canEdit?: boolean;
 * }} props
 */
export function NpsSettingsPanel({ settings, onMutate, canEdit = false }) {
  const [draft, setDraft] = useState(
    /** @type {{ autoSendEnabled: boolean; sendTimeLocal: string; sendDates: { month: number; day: number }[] } | null} */ (
      null
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      autoSendEnabled: settings.autoSendEnabled,
      sendTimeLocal: settings.sendTimeLocal,
      sendDates: settings.sendDates.map((d) => ({ ...d })),
    });
  }, [settings]);

  const maxDayForMonth = useCallback((month) => daysInMonth(month, 2024), []);

  const save = useCallback(async () => {
    if (!canEdit || !draft) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/nps/settings?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Fejl");
      setSaved(true);
      onMutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setSaving(false);
    }
  }, [canEdit, draft, onMutate]);

  const addDate = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sendDates: [...prev.sendDates, { month: 1, day: 15 }],
      };
    });
  }, []);

  const removeDate = useCallback((index) => {
    setDraft((prev) => {
      if (!prev || prev.sendDates.length <= 1) return prev;
      return {
        ...prev,
        sendDates: prev.sendDates.filter((_, i) => i !== index),
      };
    });
  }, []);

  const updateDate = useCallback((index, field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.sendDates.map((row, i) => {
        if (i !== index) return row;
        if (field === "month") {
          const month = Number(value);
          const maxDay = maxDayForMonth(month);
          return { month, day: Math.min(row.day, maxDay) };
        }
        return { ...row, day: Number(value) };
      });
      return { ...prev, sendDates: next };
    });
  }, [maxDayForMonth]);

  const previewDates = useMemo(() => {
    if (!settings?.nextOccurrences?.length) return [];
    return settings.nextOccurrences;
  }, [settings]);

  if (!settings || !draft) {
    return (
      <section className="tally-panel p-4 md:p-5">
        <p className="font-sans text-[13px] text-fg-muted">Indlæser indstillinger…</p>
      </section>
    );
  }

  return (
    <section className="tally-panel overflow-hidden">
      <div className="border-b border-border px-3 py-3 md:px-4">
        <h2 className="font-sans text-sm font-semibold text-fg">Udsendelsesindstillinger</h2>
        <p className="mt-1 max-w-2xl font-sans text-[11px] leading-relaxed text-fg-muted">
          Vælg hvilke datoer NPS-mails sendes automatisk til alle konti med{" "}
          <span className="font-medium text-fg">Send aktiv</span> slået til. Manuel udsendelse fra Konti
          påvirkes ikke.
        </p>
      </div>

      <div className="space-y-6 px-3 py-4 md:px-4">
        {error ?
          <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
            {error}
          </p>
        : null}
        {saved ?
          <p className="rounded-lg border border-agency-ok-border bg-agency-ok-soft px-3 py-2 font-sans text-[12px] text-agency-ok">
            Indstillinger gemt.
          </p>
        : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-3 font-sans text-[13px] text-fg">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={draft.autoSendEnabled}
              onChange={(e) => {
                setSaved(false);
                setDraft((d) => (d ? { ...d, autoSendEnabled: e.target.checked } : d));
              }}
              className="size-4 rounded border-border"
            />
            Automatisk udsendelse på planlagte datoer
          </label>

          <label className="flex items-center gap-2 font-sans text-[12px] text-fg-muted">
            Sendetid
            <input
              type="time"
              disabled={!canEdit}
              value={draft.sendTimeLocal}
              onChange={(e) => {
                setSaved(false);
                setDraft((d) => (d ? { ...d, sendTimeLocal: e.target.value } : d));
              }}
              className="h-8 rounded-md border border-border bg-surface-card px-2 text-[13px] text-fg"
            />
            <span className="text-[10px]">(Europe/Copenhagen)</span>
          </label>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-sans text-[12px] font-semibold uppercase tracking-wide text-fg-soft">
              Årlige udsendelsesdatoer
            </h3>
            {canEdit ?
              <button
                type="button"
                onClick={addDate}
                className="rounded-md border border-border bg-surface-muted px-2.5 py-1 font-sans text-[11px] font-medium text-fg hover:bg-surface-card"
              >
                + Tilføj dato
              </button>
            : null}
          </div>

          <ul className="space-y-2">
            {draft.sendDates.map((row, index) => {
              const maxDay = maxDayForMonth(row.month);
              return (
                <li
                  key={`${row.month}-${row.day}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-2"
                >
                  <select
                    disabled={!canEdit}
                    value={row.month}
                    onChange={(e) => {
                      setSaved(false);
                      updateDate(index, "month", e.target.value);
                    }}
                    className="h-8 min-w-[120px] rounded-md border border-border bg-surface-card px-2 text-[12px] text-fg"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={!canEdit}
                    value={row.day}
                    onChange={(e) => {
                      setSaved(false);
                      updateDate(index, "day", e.target.value);
                    }}
                    className="h-8 w-16 rounded-md border border-border bg-surface-card px-2 text-[12px] text-fg tabular-nums"
                  >
                    {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}.
                      </option>
                    ))}
                  </select>
                  {canEdit && draft.sendDates.length > 1 ?
                    <button
                      type="button"
                      onClick={() => {
                        setSaved(false);
                        removeDate(index);
                      }}
                      className="ml-auto rounded-md px-2 py-1 font-sans text-[11px] text-fg-muted hover:bg-surface-card hover:text-agency-bad"
                    >
                      Fjern
                    </button>
                  : null}
                </li>
              );
            })}
          </ul>
        </div>

        {previewDates.length > 0 ?
          <div className="rounded-xl border border-border-soft bg-agency-brand-soft/10 px-3 py-3">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-fg-soft">
              Næste planlagte udsendelser
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {previewDates.map((occ) => (
                <li
                  key={occ.isoDate}
                  className="rounded-md border border-border bg-surface-card px-2.5 py-1 font-sans text-[12px] text-fg"
                >
                  {formatIsoDateDa(occ.isoDate)}
                  <span className="ml-1.5 text-fg-muted">({occ.label})</span>
                </li>
              ))}
            </ul>
          </div>
        : null}

        {canEdit ?
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className={cn(
              "rounded-md border border-agency-brand-border bg-agency-brand px-4 py-2 font-sans text-[12px] font-medium text-canvas",
              saving && "opacity-60",
            )}
          >
            {saving ? "Gemmer…" : "Gem indstillinger"}
          </button>
        : null}
      </div>
    </section>
  );
}
