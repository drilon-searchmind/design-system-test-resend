"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ClientLogo } from "@/components/clients/client-logo";
import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";
import { CrmDialog } from "@/components/crm/crm-dialog";
import { normalizeDomain } from "@/lib/crm/client-domain";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/server/toolbox-data").ToolboxToolRow} ToolboxTool */

const DEFAULT_CATEGORY = "Andet";

const BRAND_BUTTON =
  "inline-flex h-9 shrink-0 items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-4 font-sans text-[13px] font-medium text-agency-brand transition-opacity hover:opacity-90 disabled:opacity-40";
const QUIET_BUTTON =
  "inline-flex h-9 items-center rounded-md border border-border px-4 font-sans text-[13px] text-fg-muted hover:text-fg disabled:opacity-40";

/** @param {string} url */
function hostOf(url) {
  return normalizeDomain(url);
}

/**
 * @param {{ tools: ToolboxTool[]; isAdmin: boolean }} props
 */
export function ToolboxHub({ tools, isAdmin }) {
  const [query, setQuery] = useState("");
  /** `null` = lukket, `"new"` = opret, ellers værktøjet der redigeres. */
  const [editing, setEditing] = useState(/** @type {ToolboxTool | "new" | null} */ (null));

  const categories = useMemo(
    () => [...new Set(tools.map((t) => t.category))].sort((a, b) => a.localeCompare(b, "da")),
    [tools],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    /** @type {Map<string, ToolboxTool[]>} */
    const byCategory = new Map();
    for (const tool of tools) {
      if (q) {
        const haystack = `${tool.name} ${tool.description} ${tool.category} ${hostOf(tool.url)}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const list = byCategory.get(tool.category) ?? [];
      list.push(tool);
      byCategory.set(tool.category, list);
    }
    return [...byCategory.entries()].sort(([a], [b]) => {
      if (a === DEFAULT_CATEGORY) return 1;
      if (b === DEFAULT_CATEGORY) return -1;
      return a.localeCompare(b, "da");
    });
  }, [tools, query]);

  return (
    <div className="flex flex-col gap-6">
      {tools.length > 0 || isAdmin ?
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {tools.length > 0 ?
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg i værktøjer…"
              aria-label="Søg i værktøjer"
              className={cn(clientEditInputClass, "sm:max-w-xs")}
            />
          : <span />}
          {isAdmin ?
            <button type="button" className={BRAND_BUTTON} onClick={() => setEditing("new")}>
              Tilføj værktøj
            </button>
          : null}
        </div>
      : null}

      {tools.length === 0 ?
        <div className="tally-panel flex flex-col items-start gap-2 p-6">
          <p className="font-sans text-[14px] font-semibold text-fg">Ingen værktøjer endnu</p>
          <p className="max-w-prose font-sans text-[13px] text-fg-muted">
            {isAdmin ?
              "Tilføj de værktøjer, bureauet bruger i hverdagen, fx ClickUp, Looker Studio, Google Analytics eller Figma. De vises her for hele teamet."
            : "En admin har ikke tilføjet nogen værktøjer endnu."}
          </p>
        </div>
      : groups.length === 0 ?
        <p className="font-sans text-[13px] text-fg-muted">Ingen værktøjer matcher «{query.trim()}».</p>
      : groups.map(([category, list]) => (
          <section key={category} aria-label={category}>
            <h3 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {category}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((tool) => (
                <ToolCard key={tool.id} tool={tool} isAdmin={isAdmin} onEdit={() => setEditing(tool)} />
              ))}
            </ul>
          </section>
        ))
      }

      {isAdmin ?
        <CrmDialog
          open={editing !== null}
          onClose={() => setEditing(null)}
          ariaLabel={editing === "new" ? "Tilføj værktøj" : "Rediger værktøj"}
          maxWidthClass="w-[min(100vw-1.5rem,520px)]"
        >
          {editing !== null ?
            <ToolForm
              key={editing === "new" ? "new" : editing.id}
              tool={editing === "new" ? null : editing}
              categories={categories}
              onClose={() => setEditing(null)}
            />
          : null}
        </CrmDialog>
      : null}
    </div>
  );
}

/**
 * @param {{ tool: ToolboxTool; isAdmin: boolean; onEdit: () => void }} props
 */
function ToolCard({ tool, isAdmin, onEdit }) {
  const host = hostOf(tool.url);
  return (
    <li className="group relative">
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tally-panel flex h-full items-start gap-3 p-4 transition-colors hover:border-agency-brand-border hover:bg-surface-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ClientLogo
          client={{ name: tool.name, primaryDomain: host }}
          variant="solid"
          className="size-10 rounded-lg text-[12px]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("flex items-center gap-1.5", isAdmin && "pr-8")}>
            <span className="truncate font-sans text-[13.5px] font-semibold text-fg">{tool.name}</span>
            <span
              aria-hidden
              className="shrink-0 text-[12px] text-fg-quiet transition-colors group-hover:text-agency-brand"
            >
              ↗
            </span>
            {tool.adminOnly ?
              <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-fg-muted">
                Kun admin
              </span>
            : null}
          </span>
          {host ?
            <span className="truncate font-sans text-[11px] text-fg-quiet">{host}</span>
          : null}
          {tool.description ?
            <span className="mt-1 line-clamp-2 font-sans text-[12px] leading-snug text-fg-muted">
              {tool.description}
            </span>
          : null}
        </span>
      </a>
      {isAdmin ?
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Rediger ${tool.name}`}
          title="Rediger"
          className="absolute right-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-md border border-border bg-surface-card font-sans text-[12px] text-fg-muted opacity-0 transition-opacity hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
        >
          ✎
        </button>
      : null}
    </li>
  );
}

/**
 * @param {{ tool: ToolboxTool | null; categories: string[]; onClose: () => void }} props
 */
function ToolForm({ tool, categories, onClose }) {
  const router = useRouter();
  const [name, setName] = useState(tool?.name ?? "");
  const [url, setUrl] = useState(tool?.url ?? "");
  const [description, setDescription] = useState(tool?.description ?? "");
  const [category, setCategory] = useState(tool && tool.category !== DEFAULT_CATEGORY ? tool.category : "");
  const [adminOnly, setAdminOnly] = useState(tool?.adminOnly ?? false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const pending = busy || refreshing;

  /**
   * @param {string} endpoint
   * @param {"POST" | "PATCH" | "DELETE"} method
   * @param {Record<string, unknown>} [body]
   */
  const send = async (endpoint, method, body) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme");
      startRefresh(() => {
        router.refresh();
        onClose();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const payload = { name: name.trim(), url: url.trim(), description: description.trim(), category: category.trim(), adminOnly };
    if (tool) void send(`/api/toolbox/${encodeURIComponent(tool.id)}`, "PATCH", payload);
    else void send("/api/toolbox", "POST", payload);
  };

  const remove = () => {
    if (!tool || !window.confirm(`Fjern «${tool.name}» fra Toolbox?`)) return;
    void send(`/api/toolbox/${encodeURIComponent(tool.id)}`, "DELETE");
  };

  return (
    <form
      className="flex max-h-[min(92vh,820px)] flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Toolbox</p>
          <h2 className="font-sans text-[17px] font-semibold leading-snug text-fg md:text-[18px]">
            {tool ? "Rediger værktøj" : "Tilføj værktøj"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-lg leading-none text-fg-muted hover:border-agency-brand-border hover:text-fg disabled:opacity-40"
          aria-label="Luk"
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-6 pt-4 md:px-6">
        {error ?
          <p className="rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
            {error}
          </p>
        : null}
        <Field label="Navn *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fx ClickUp"
            maxLength={80}
            className={clientEditInputClass}
            autoFocus
          />
        </Field>
        <Field label="URL *">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://app.clickup.com"
            inputMode="url"
            className={clientEditInputClass}
          />
        </Field>
        <Field label="Kort beskrivelse">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hvad bruger vi værktøjet til?"
            maxLength={240}
            rows={3}
            className={cn(clientEditInputClass, "h-auto resize-none py-2")}
          />
        </Field>
        <Field label="Kategori">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={`fx Analyse, Projektstyring (tom = ${DEFAULT_CATEGORY})`}
            list="toolbox-categories"
            maxLength={40}
            className={clientEditInputClass}
          />
          <datalist id="toolbox-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <label className="flex items-center gap-2 font-sans text-[12.5px] text-fg-muted">
          <input type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
          Kun synlig for admins
        </label>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          {tool ?
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-9 items-center rounded-md px-2 font-sans text-[13px] text-agency-bad hover:bg-agency-bad-soft disabled:opacity-40"
            >
              Fjern
            </button>
          : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={pending} className={QUIET_BUTTON}>
              Annuller
            </button>
            <button type="submit" disabled={pending || !name.trim() || !url.trim()} className={BRAND_BUTTON}>
              {pending ? "Gemmer…" : tool ? "Gem" : "Tilføj"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** @param {{ label: string; children: import("react").ReactNode }} props */
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 font-sans text-[12px] text-fg-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}
