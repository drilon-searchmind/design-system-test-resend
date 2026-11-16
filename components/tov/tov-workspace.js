"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import {
  TovHistoryPanel,
  TovJsonPanel,
  TovPlaygroundPanel,
  TovPreviewPanel,
} from "@/components/tov/tov-panels";
import { TovProfileView } from "@/components/tov/tov-profile-view";
import {
  TovCard,
  TovStatusChip,
  formatTovDate,
  tovBtn,
  tovBtnPrimary,
  tovFetch,
  tovInput,
  tovTextarea,
} from "@/components/tov/tov-ui";
import { cn } from "@/lib/utils";

const KIND_LABEL = { pdf: "PDF", image: "Billede", text: "Tekst", html: "Web" };

/** @param {number} bytes */
function formatSize(bytes) {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes > 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} B`;
}

/**
 * @param {{
 *   clientKey: string;
 *   state: Record<string, any>;
 *   reload: () => Promise<void>;
 * }} props
 */
function TovWorkspaceBody({ clientKey, state, reload }) {
  const base = `/api/clients/${encodeURIComponent(clientKey)}/tov`;
  const tov = state.tov;
  const status = tov?.status ?? "empty";
  const analyzing = status === "analyzing";

  const [tab, setTab] = useState("profil");
  const [comment, setComment] = useState(tov?.comment ?? "");
  const [model, setModel] = useState(tov?.model ?? state.models[0].id);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState({ name: "", text: "", open: false });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(/** @type {{ kind: "ok" | "bad"; text: string } | null} */ (null));
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const run = useCallback(
    /** @param {string} label @param {() => Promise<unknown>} fn */
    async (label, fn) => {
      setBusy(label);
      setMessage(null);
      try {
        await fn();
        await reload();
      } catch (e) {
        setMessage({ kind: "bad", text: e instanceof Error ? e.message : "Fejl" });
      } finally {
        setBusy("");
      }
    },
    [reload],
  );

  /** @param {FileList | File[]} list */
  async function uploadFiles(list) {
    const files = [...list];
    if (!files.length) return;
    setBusy("upload");
    setMessage(null);
    /** @type {string[]} */
    const errors = [];
    for (const [i, file] of files.entries()) {
      const form = new FormData();
      form.append("files", file);
      try {
        await tovFetch(`${base}/sources`, { method: "POST", body: form });
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "fejl"}`);
      }
      if (i < files.length - 1) await reload();
    }
    await reload();
    setBusy("");
    if (errors.length) setMessage({ kind: "bad", text: errors.join(" · ") });
    if (fileRef.current) fileRef.current.value = "";
  }

  const saveSettings = (patch) =>
    tovFetch(base, { method: "PATCH", json: patch }).catch(() => {
      /* non-critical: values are also sent with the analysis request */
    });

  const hasProfile = Boolean(tov?.profile);
  const sources = state.sources;

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      {message ?
        <p
          className={cn(
            "rounded-lg border px-3 py-2 font-sans text-[12px]",
            message.kind === "bad" ?
              "border-agency-bad-border bg-agency-bad-soft text-agency-bad"
            : "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
          )}
        >
          {message.text}
        </p>
      : null}

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <TovCard
          title={`Materiale · ${sources.length}`}
          hint="Upload alt der kan sige noget om kundens tone: brandbøger (PDF), mails (.eml/.txt/indsat tekst), .md/.txt, billeder og links til deres website."
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void uploadFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
              dragging ? "border-agency-brand bg-agency-brand-soft" : "border-border bg-surface-muted/30",
            )}
          >
            <p className="font-sans text-[13px] text-fg-muted">Træk filer hertil eller</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.markdown,.eml,.csv,.json,.html,.htm"
              className="hidden"
              onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
            />
            <button type="button" className={tovBtn} disabled={busy === "upload"} onClick={() => fileRef.current?.click()}>
              {busy === "upload" ? "Uploader…" : "Vælg filer"}
            </button>
            <p className="font-sans text-[11px] text-fg-quiet">PDF, billeder, .txt, .md, .eml, .csv, .json, .html · max 8 MB pr. fil</p>
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!url.trim()) return;
              void run("url", async () => {
                await tovFetch(`${base}/sources`, { method: "POST", json: { url } });
                setUrl("");
              });
            }}
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://kundens-website.dk/om-os"
              className={tovInput}
              aria-label="Link til side"
            />
            <button type="submit" className={cn(tovBtn, "shrink-0")} disabled={busy === "url" || !url.trim()}>
              {busy === "url" ? "Henter…" : "Tilføj link"}
            </button>
          </form>

          {note.open ?
            <div className="mt-3 space-y-2 rounded-lg border border-border-soft p-3">
              <input
                value={note.name}
                onChange={(e) => setNote((n) => ({ ...n, name: e.target.value }))}
                placeholder="Titel (fx 'Mail fra marketingchef')"
                className={tovInput}
              />
              <textarea
                value={note.text}
                onChange={(e) => setNote((n) => ({ ...n, text: e.target.value }))}
                rows={6}
                placeholder="Indsæt mail eller tekst…"
                className={tovTextarea}
              />
              <div className="flex justify-end gap-2">
                <button type="button" className={tovBtn} onClick={() => setNote({ name: "", text: "", open: false })}>
                  Annullér
                </button>
                <button
                  type="button"
                  className={tovBtnPrimary}
                  disabled={busy === "note" || note.text.trim().length < 20}
                  onClick={() =>
                    run("note", async () => {
                      await tovFetch(`${base}/sources`, { method: "POST", json: { name: note.name, text: note.text } });
                      setNote({ name: "", text: "", open: false });
                    })
                  }
                >
                  Tilføj tekst
                </button>
              </div>
            </div>
          : <button type="button" className={cn(tovBtn, "mt-3")} onClick={() => setNote((n) => ({ ...n, open: true }))}>
              + Indsæt tekst / mail
            </button>}

          {sources.length ?
            <ul className="mt-4 divide-y divide-border-soft">
              {sources.map((s) => (
                <li key={s.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 inline-flex h-[20px] shrink-0 items-center rounded-md border border-border bg-surface-muted px-1.5 font-sans text-[10px] font-semibold uppercase text-fg-muted">
                    {s.kind === "url" ? "Link" : (KIND_LABEL[s.mediaType] ?? s.mediaType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13px] font-medium text-fg">{s.name}</p>
                    <p className="truncate font-sans text-[11px] text-fg-quiet">
                      {s.url ? `${s.url} · ` : ""}
                      {formatSize(s.size)}
                      {s.hasHints ? " · inkl. fonte/farver" : ""}
                      {s.createdBy ? ` · ${s.createdBy}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 font-sans text-[11px] text-agency-bad hover:underline disabled:opacity-50"
                    disabled={analyzing}
                    onClick={() => run("del", () => tovFetch(`${base}/sources/${s.id}`, { method: "DELETE" }))}
                  >
                    Fjern
                  </button>
                </li>
              ))}
            </ul>
          : null}
        </TovCard>

        <TovCard
          title="Analyse"
          hint="Modellen læser alt materialet og opdaterer kundens standardiserede Tone of Voice-profil."
          actions={<TovStatusChip status={status} />}
        >
          <label className="block font-sans text-[11px] font-medium text-fg-soft" htmlFor="tov-comment">
            Kommentar / ekstra information
          </label>
          <textarea
            id="tov-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => void saveSettings({ comment })}
            rows={5}
            placeholder="Fx: 'Målgruppen er ældre mænd, de vil ikke lyde som en startup. Brug De-form i mails.'"
            className={cn(tovTextarea, "mt-1")}
          />

          <label className="mt-3 block font-sans text-[11px] font-medium text-fg-soft" htmlFor="tov-model">
            AI-model
          </label>
          <select
            id="tov-model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              void saveSettings({ model: e.target.value });
            }}
            className={cn(tovInput, "mt-1")}
          >
            {state.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={cn(tovBtnPrimary, "mt-4 w-full")}
            disabled={analyzing || busy === "analyze" || (sources.length === 0 && !comment.trim())}
            onClick={() =>
              run("analyze", () => tovFetch(`${base}/analyze`, { method: "POST", json: { model, comment } }))
            }
          >
            {analyzing ? "Analyserer… (kan tage 1-3 min)" : hasProfile ? "Analysér igen" : "Analysér materiale"}
          </button>

          {hasProfile && !analyzing ?
            <p className="mt-2 font-sans text-[11px] leading-snug text-fg-quiet">
              Den eksisterende profil sendes med, så en ny analyse forfiner den. Forrige version gemmes i historikken.
            </p>
          : null}
          {analyzing ?
            <p className="mt-2 font-sans text-[11px] text-agency-brand">
              Du kan forlade siden — analysen kører videre på serveren.
            </p>
          : null}
          {status === "error" && tov?.error ?
            <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
              {tov.error}
            </p>
          : null}
          {tov?.analyzedAt ?
            <p className="mt-3 font-sans text-[11px] text-fg-quiet">
              Sidst analyseret {formatTovDate(tov.analyzedAt)}
              {tov.analyzedBy ? ` af ${tov.analyzedBy}` : ""} · {tov.analyzedModel}
              {tov.usage ? ` · ${tov.usage.input.toLocaleString("da-DK")} ind / ${tov.usage.output.toLocaleString("da-DK")} ud tokens` : ""}
            </p>
          : null}
          {tov?.outdatedSchema ?
            <p className="mt-2 font-sans text-[11px] text-agency-warn">
              Profilen er lavet med et ældre skema — kør analysen igen for at få de nyeste felter.
            </p>
          : null}
        </TovCard>
      </div>

      {hasProfile ?
        <>
          <nav aria-label="Tone of Voice-visning" className="border-b border-border/60 pb-3">
            <PulseSegmentedControl
              size="sm"
              active={tab}
              onChange={setTab}
              className="max-w-full"
              tabs={[
                { id: "profil", label: "Profil" },
                { id: "preview", label: "Eksempel" },
                { id: "json", label: "JSON" },
                { id: "omskriv", label: "Omskriv tekst" },
                { id: "versioner", label: "Versioner", count: tov.history.length },
              ]}
            />
          </nav>
          {tab === "profil" ? <TovProfileView profile={tov.profile} /> : null}
          {tab === "preview" ?
            <TovPreviewPanel clientKey={clientKey} preview={tov.preview} model={model} onChanged={() => void reload()} />
          : null}
          {tab === "json" ?
            <TovJsonPanel
              clientKey={clientKey}
              profile={tov.profile}
              clientName={state.client.name}
              onChanged={() => void reload()}
            />
          : null}
          {tab === "omskriv" ? <TovPlaygroundPanel clientKey={clientKey} model={model} /> : null}
          {tab === "versioner" ?
            <TovHistoryPanel clientKey={clientKey} history={tov.history} onChanged={() => void reload()} />
          : null}
        </>
      : null}
    </div>
  );
}

/**
 * Tone of Voice-arbejdsrum for én kunde (bruges både på /tov/[kunde] og som fane på kundekortet).
 * @param {{ clientKey: string }} props
 */
export function TovWorkspace({ clientKey }) {
  const [state, setState] = useState(/** @type {Record<string, any> | null} */ (null));
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setState(await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente Tone of Voice");
    }
  }, [clientKey]);

  useEffect(() => {
    let cancelled = false;
    tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`)
      .then((d) => {
        if (!cancelled) setState(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Kunne ikke hente Tone of Voice");
      });
    return () => {
      cancelled = true;
    };
  }, [clientKey]);

  const analyzing = state?.tov?.status === "analyzing";
  useEffect(() => {
    if (!analyzing) return undefined;
    const id = setInterval(() => void reload(), 4000);
    return () => clearInterval(id);
  }, [analyzing, reload]);

  if (error && !state) {
    return (
      <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-4 py-3 font-sans text-[13px] text-agency-bad">
        {error}
      </p>
    );
  }
  if (!state) return <div className="h-[320px] animate-pulse rounded-2xl bg-skeleton" />;
  return <TovWorkspaceBody clientKey={clientKey} state={state} reload={reload} />;
}
