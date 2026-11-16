"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import {
  TovHistoryPanel,
  TovJsonPanel,
  TovPlaygroundPanel,
  TovPreviewPanel,
} from "@/components/tov/tov-panels";
import { TovAnalysisProgress } from "@/components/tov/tov-progress";
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
 *   completion: { key: string; id: number };
 * }} props
 */
function TovWorkspaceBody({ clientKey, state, reload, completion }) {
  const base = `/api/clients/${encodeURIComponent(clientKey)}/tov`;
  const tov = state.tov;
  const status = tov?.status ?? "empty";
  const analyzing = status === "analyzing";
  const hasProfile = Boolean(tov?.profile);
  const sources = state.sources;

  const [stage, setStage] = useState(hasProfile ? "resultat" : "materiale");
  const [tab, setTab] = useState("profil");
  const [comment, setComment] = useState(tov?.comment ?? "");
  const [model, setModel] = useState(tov?.model ?? state.models[0].id);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState({ name: "", text: "", open: false });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(/** @type {{ kind: "ok" | "bad"; text: string } | null} */ (null));
  const [dragging, setDragging] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [handledCompletion, setHandledCompletion] = useState(0);
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const resultRef = useRef(/** @type {HTMLElement | null} */ (null));

  // Parent bumps completion.id when polling sees analyzing → ready (adjust state during render)
  if (completion.key === clientKey && completion.id > 0 && completion.id !== handledCompletion) {
    setHandledCompletion(completion.id);
    setStage("resultat");
    setTab("profil");
    setJustFinished(true);
    setMessage({ kind: "ok", text: "Analyse færdig — profilen er klar." });
  }

  useEffect(() => {
    if (completion.key !== clientKey || completion.id === 0) return undefined;
    const scrollId = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const clearId = setTimeout(() => setJustFinished(false), 8000);
    return () => {
      cancelAnimationFrame(scrollId);
      clearTimeout(clearId);
    };
  }, [completion.key, completion.id, clientKey]);

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
    if (analyzing) return;
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
      /* non-critical */
    });

  function cancelAnalysis() {
    void run("cancel", () => tovFetch(`${base}/analyze`, { method: "DELETE" }));
  }

  const locked = analyzing || busy === "cancel";

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <nav aria-label="Tone of Voice-trin" className="border-b border-border/60 pb-3">
        <PulseSegmentedControl
          size="sm"
          active={stage}
          onChange={(id) => {
            if (analyzing && id === "resultat" && !hasProfile) return;
            setStage(id);
            setJustFinished(false);
          }}
          className="max-w-full"
          tabs={[
            { id: "materiale", label: "1. Materiale & analyse" },
            { id: "resultat", label: "2. Resultat" },
          ]}
        />
      </nav>

      {analyzing ?
        <TovAnalysisProgress
          startedAt={tov?.analysisStartedAt ?? null}
          modelLabel={state.models.find((m) => m.id === model)?.label ?? model}
          sourceCount={sources.length}
          onCancel={cancelAnalysis}
          cancelling={busy === "cancel"}
        />
      : null}

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

      {stage === "materiale" ?
        <div
          className={cn(
            "relative grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start",
            locked && "select-none",
          )}
        >
          {locked ?
            <div
              className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl bg-canvas/40"
              aria-hidden
              onClick={(e) => e.preventDefault()}
            />
          : null}

          <TovCard
            title={`Materiale · ${sources.length}`}
            hint="Upload alt der kan sige noget om kundens tone: brandbøger (PDF), mails (.eml/.txt/indsat tekst), .md/.txt, billeder og links til deres website."
          >
            <div
              onDragOver={(e) => {
                if (locked) return;
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!locked) void uploadFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                dragging ? "border-agency-brand bg-agency-brand-soft" : "border-border bg-surface-muted/30",
                locked && "opacity-60",
              )}
            >
              <p className="font-sans text-[13px] text-fg-muted">Træk filer hertil eller</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                disabled={locked}
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.markdown,.eml,.csv,.json,.html,.htm"
                className="hidden"
                onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
              />
              <button
                type="button"
                className={tovBtn}
                disabled={locked || busy === "upload"}
                onClick={() => fileRef.current?.click()}
              >
                {busy === "upload" ? "Uploader…" : "Vælg filer"}
              </button>
              <p className="font-sans text-[11px] text-fg-quiet">
                PDF, billeder, .txt, .md, .eml, .csv, .json, .html · max 8 MB pr. fil
              </p>
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (locked || !url.trim()) return;
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
                disabled={locked}
              />
              <button
                type="submit"
                className={cn(tovBtn, "shrink-0")}
                disabled={locked || busy === "url" || !url.trim()}
              >
                {busy === "url" ? "Henter…" : "Tilføj link"}
              </button>
            </form>

            {note.open && !locked ?
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
                        await tovFetch(`${base}/sources`, {
                          method: "POST",
                          json: { name: note.name, text: note.text },
                        });
                        setNote({ name: "", text: "", open: false });
                      })
                    }
                  >
                    Tilføj tekst
                  </button>
                </div>
              </div>
            : !locked ?
              <button type="button" className={cn(tovBtn, "mt-3")} onClick={() => setNote((n) => ({ ...n, open: true }))}>
                + Indsæt tekst / mail
              </button>
            : null}

            {sources.length ?
              <ul className={cn("mt-4 divide-y divide-border-soft", locked && "opacity-70")}>
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
                      disabled={locked}
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
              onBlur={() => !locked && void saveSettings({ comment })}
              rows={5}
              disabled={locked}
              placeholder="Fx: 'Målgruppen er ældre mænd, de vil ikke lyde som en startup. Brug De-form i mails.'"
              className={cn(tovTextarea, "mt-1")}
            />

            <label className="mt-3 block font-sans text-[11px] font-medium text-fg-soft" htmlFor="tov-model">
              AI-model
            </label>
            <select
              id="tov-model"
              value={model}
              disabled={locked}
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

            {!analyzing ?
              <button
                type="button"
                className={cn(tovBtnPrimary, "mt-4 w-full")}
                disabled={busy === "analyze" || (sources.length === 0 && !comment.trim())}
                onClick={() =>
                  run("analyze", () => tovFetch(`${base}/analyze`, { method: "POST", json: { model, comment } }))
                }
              >
                {busy === "analyze" ? "Starter…" : hasProfile ? "Analysér igen" : "Analysér materiale"}
              </button>
            : null}

            {hasProfile && !analyzing ?
              <p className="mt-2 font-sans text-[11px] leading-snug text-fg-quiet">
                Den eksisterende profil sendes med, så en ny analyse forfiner den. Forrige version gemmes i historikken.
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
                {tov.usage ?
                  ` · ${tov.usage.input.toLocaleString("da-DK")} ind / ${tov.usage.output.toLocaleString("da-DK")} ud tokens`
                : ""}
              </p>
            : null}
            {tov?.outdatedSchema ?
              <p className="mt-2 font-sans text-[11px] text-agency-warn">
                Profilen er lavet med et ældre skema — kør analysen igen for at få de nyeste felter.
              </p>
            : null}

            {hasProfile && !analyzing ?
              <button type="button" className={cn(tovBtn, "mt-4 w-full")} onClick={() => setStage("resultat")}>
                Se resultat →
              </button>
            : null}
          </TovCard>
        </div>
      : null}

      {stage === "resultat" ?
        <div ref={resultRef} className="flex flex-col gap-[length:var(--ds-studio-stack)]">
          {justFinished ?
            <div className="rounded-2xl border border-agency-ok-border bg-agency-ok-soft px-4 py-3">
              <p className="font-sans text-[13px] font-semibold text-agency-ok">Profilen er klar</p>
              <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
                Gennemgå profilen herunder — eller generér et HTML-eksempel under fanen Eksempel.
              </p>
            </div>
          : null}

          {!hasProfile ?
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
              <p className="font-sans text-[14px] font-medium text-fg">Ingen profil endnu</p>
              <p className="mt-1 font-sans text-[12px] text-fg-muted">
                Upload materiale og kør analysen under trin 1 først.
              </p>
              <button type="button" className={cn(tovBtnPrimary, "mt-4")} onClick={() => setStage("materiale")}>
                Gå til materiale & analyse
              </button>
            </div>
          : <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-sans text-[15px] font-semibold tracking-tight text-fg">
                    {state.client.name} · Tone of Voice
                  </h2>
                  <p className="mt-0.5 font-sans text-[12px] text-fg-muted">
                    Sidst analyseret {formatTovDate(tov.analyzedAt)}
                    {tov.analyzedModel ? ` · ${tov.analyzedModel}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TovStatusChip status={status} />
                  <button
                    type="button"
                    className={tovBtn}
                    disabled={analyzing}
                    onClick={() => setStage("materiale")}
                  >
                    ← Tilbage til materiale
                  </button>
                </div>
              </div>

              <nav aria-label="Resultat-visning" className="border-b border-border/60 pb-3">
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
                <TovPreviewPanel
                  clientKey={clientKey}
                  preview={tov.preview}
                  model={model}
                  onChanged={() => void reload()}
                />
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
            </>}
        </div>
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
  const [completion, setCompletion] = useState({ key: "", id: 0 });
  const statusRef = useRef(/** @type {string | null} */ (null));

  const applyState = useCallback(
    (next) => {
      const nextStatus = next?.tov?.status ?? "empty";
      const prev = statusRef.current;
      statusRef.current = nextStatus;
      setState(next);
      if (prev === "analyzing" && nextStatus === "ready") {
        setCompletion((c) => ({ key: clientKey, id: c.key === clientKey ? c.id + 1 : 1 }));
      }
    },
    [clientKey],
  );

  const reload = useCallback(async () => {
    try {
      applyState(await tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente Tone of Voice");
    }
  }, [clientKey, applyState]);

  useEffect(() => {
    let cancelled = false;
    statusRef.current = null;
    tovFetch(`/api/clients/${encodeURIComponent(clientKey)}/tov`)
      .then((d) => {
        if (!cancelled) applyState(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Kunne ikke hente Tone of Voice");
      });
    return () => {
      cancelled = true;
    };
  }, [clientKey, applyState]);

  const analyzing = state?.tov?.status === "analyzing";
  useEffect(() => {
    if (!analyzing) return undefined;
    const id = setInterval(() => void reload(), 3000);
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
  return (
    <TovWorkspaceBody
      key={clientKey}
      clientKey={clientKey}
      state={state}
      reload={reload}
      completion={completion}
    />
  );
}
