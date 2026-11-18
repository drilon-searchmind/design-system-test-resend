"use client";

import { useState } from "react";

import { TovPreviewProgress, TovRewriteProgress } from "@/components/tov/tov-progress";
import { TovCard, formatTovDate, tovBtn, tovBtnPrimary, tovFetch, tovTextarea } from "@/components/tov/tov-ui";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------- Preview */

/**
 * @param {{
 *   clientKey: string;
 *   preview: { html: string; title: string; model: string; generatedAt: string } | null;
 *   model: string;
 *   onChanged: () => void;
 * }} props
 */
export function TovPreviewPanel({ clientKey, preview, model, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [width, setWidth] = useState("100%");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov/preview`, { method: "POST", json: { model } });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }

  function downloadHtml() {
    if (!preview) return;
    const blob = new Blob([preview.html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(preview.title || "brand-core").toLowerCase().replace(/[^a-z0-9æøå]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <TovCard
      title="Brand guidelines (Brand Core-dokument)"
      hint="Et brand guidelines-dokument med forside, brand essens, tone of voice, farver, typografi og budskaber. Teksterne skrives af modellen ud fra profilen; dokumentet gemmes i databasen og genereres kun når du beder om det. Download som HTML og udskriv som PDF fra browseren."
      actions={
        busy ? null : (
          <>
            {preview ?
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {[
                  ["100%", "Desktop"],
                  ["390px", "Mobil"],
                ].map(([w, label]) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    className={cn(
                      "h-8 px-3 font-sans text-[12px]",
                      width === w ? "bg-agency-brand-soft text-agency-brand" : "bg-surface-muted text-fg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            : null}
            {preview ?
              <button type="button" onClick={downloadHtml} className={tovBtn}>
                Download HTML
              </button>
            : null}
            <button type="button" onClick={generate} className={preview ? tovBtn : tovBtnPrimary}>
              {preview ? "Generér nyt dokument" : "Generér dokument"}
            </button>
          </>
        )
      }
    >
      {error ?
        <p className="mb-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 text-[12px] text-agency-bad">
          {error}
        </p>
      : null}
      {busy ?
        <TovPreviewProgress modelLabel={model} />
      : preview ?
        <>
          <p className="mb-2 font-sans text-[11px] text-fg-quiet">
            {preview.title ? `${preview.title} · ` : ""}Genereret {formatTovDate(preview.generatedAt)} · {preview.model}
          </p>
          <div className="overflow-auto rounded-lg border border-border bg-white">
            {/* sandbox without allow-scripts: generated markup can never run code */}
            <iframe
              title="Brand Core – brand guidelines"
              sandbox=""
              srcDoc={preview.html}
              style={{ width, maxWidth: "100%", height: 880, margin: "0 auto", display: "block", border: 0 }}
            />
          </div>
        </>
      : <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center font-sans text-[13px] text-fg-muted">
          Intet brand guidelines-dokument endnu.
        </p>}
    </TovCard>
  );
}

/* ----------------------------------------------------------------------- JSON */

/**
 * @param {{ clientKey: string; profile: Record<string, any>; clientName: string; onChanged: () => void }} props
 */
export function TovJsonPanel({ clientKey, profile, clientName, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(profile, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `brand-core-${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const parsed = JSON.parse(draft);
      await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`, { method: "PATCH", json: { profile: parsed } });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof SyntaxError ? "Ugyldig JSON" : e instanceof Error ? e.message : "Fejl");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TovCard
      title="Standardiseret JSON"
      hint="Samme struktur for alle kunder. Manuelle rettelser normaliseres til skemaet og den forrige version gemmes."
      actions={
        editing ?
          <>
            <button type="button" className={tovBtn} onClick={() => setEditing(false)} disabled={saving}>
              Annullér
            </button>
            <button type="button" className={tovBtnPrimary} onClick={save} disabled={saving}>
              {saving ? "Gemmer…" : "Gem JSON"}
            </button>
          </>
        : <>
            <button type="button" className={tovBtn} onClick={copy}>
              {copied ? "Kopieret ✓" : "Kopiér"}
            </button>
            <button type="button" className={tovBtn} onClick={download}>
              Download .json
            </button>
            <button
              type="button"
              className={tovBtn}
              onClick={() => {
                setDraft(json);
                setError("");
                setEditing(true);
              }}
            >
              Redigér
            </button>
          </>
      }
    >
      {error ? <p className="mb-2 text-[12px] text-agency-bad">{error}</p> : null}
      {editing ?
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className={cn(tovTextarea, "h-[620px] font-mono text-[12px] leading-snug")}
        />
      : <pre className="max-h-[620px] overflow-auto rounded-lg border border-border bg-surface-muted/50 p-4 font-mono text-[12px] leading-snug text-fg">
          {json}
        </pre>}
    </TovCard>
  );
}

/* ----------------------------------------------------------------- Playground */

/** @param {{ clientKey: string; model: string }} props */
export function TovPlaygroundPanel({ clientKey, model }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(/** @type {{ rewritten: string; changes: string[] } | null} */ (null));

  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov/rewrite`, { method: "POST", json: { text, model } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TovCard
      title="Omskriv i kundens tone"
      hint="Indsæt en vilkårlig tekst (udkast, mail, annonce) og få den omskrevet i kundens tone of voice. Resultatet gemmes ikke."
      actions={
        busy ? null : (
          <button type="button" className={tovBtnPrimary} onClick={run} disabled={!text.trim()}>
            Omskriv
          </button>
        )
      }
    >
      {busy ?
        <TovRewriteProgress modelLabel={model} />
      : <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Indsæt tekst her…"
            className={tovTextarea}
          />
          <div className="min-h-[200px] rounded-md border border-border bg-surface-muted/40 p-3">
            {error ? <p className="text-[12px] text-agency-bad">{error}</p> : null}
            {result ?
              <>
                <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">{result.rewritten}</p>
                {result.changes.length ?
                  <ul className="mt-3 list-disc space-y-1 border-t border-border-soft pt-3 pl-4 font-sans text-[11px] text-fg-muted">
                    {result.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                : null}
                <button
                  type="button"
                  className={cn(tovBtn, "mt-3")}
                  onClick={() => navigator.clipboard.writeText(result.rewritten)}
                >
                  Kopiér tekst
                </button>
              </>
            : !error ?
              <p className="font-sans text-[12px] text-fg-quiet">Resultatet vises her.</p>
            : null}
          </div>
        </div>}
    </TovCard>
  );
}

/* -------------------------------------------------------------------- History */

/**
 * @param {{
 *   clientKey: string;
 *   history: Array<{ index: number; analyzedAt: string; analyzedBy: string; model: string; note: string }>;
 *   onChanged: () => void;
 * }} props
 */
export function TovHistoryPanel({ clientKey, history, onChanged }) {
  const [busy, setBusy] = useState(-1);
  const [error, setError] = useState("");

  async function restore(index) {
    if (!window.confirm("Gendan denne version? Den nuværende version gemmes i historikken.")) return;
    setBusy(index);
    setError("");
    try {
      await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`, { method: "PATCH", json: { restoreIndex: index } });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(-1);
    }
  }

  return (
    <TovCard title="Versionshistorik" hint="De seneste 10 versioner gemmes automatisk når profilen opdateres eller redigeres.">
      {error ? <p className="mb-2 text-[12px] text-agency-bad">{error}</p> : null}
      {history.length === 0 ?
        <p className="font-sans text-[13px] text-fg-muted">Ingen tidligere versioner endnu.</p>
      : <ul className="divide-y divide-border-soft">
          {history.map((h) => (
            <li key={h.index} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-sans text-[13px] text-fg">{formatTovDate(h.analyzedAt)}</p>
                <p className="font-sans text-[11px] text-fg-quiet">
                  {[h.note, h.analyzedBy, h.model].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className={tovBtn} disabled={busy !== -1} onClick={() => restore(h.index)}>
                {busy === h.index ? "Gendanner…" : "Gendan"}
              </button>
            </li>
          ))}
        </ul>}
    </TovCard>
  );
}
