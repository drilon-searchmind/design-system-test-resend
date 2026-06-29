"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { KbGridCard } from "@/components/kb/kb-grid-card";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { routes } from "@/config/routes";
import { KNOWLEDGE_ARTICLES, KNOWLEDGE_CATEGORIES } from "@/lib/crm/knowledge-data";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { getKnowledgeCategoryById } from "@/lib/crm/knowledge-utils";
import { TEAM } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID_LIST =
  "grid-cols-[minmax(220px,2.5fr)_minmax(52px,0.4fr)_minmax(76px,0.62fr)_minmax(70px,0.55fr)_minmax(120px,0.92fr)_minmax(92px,0.65fr)_minmax(64px,0.5fr)_36px]";

/** @param {{ audience: 'internal'|'client'|'public' }} props */
function AudienceLabel({ audience }) {
  const t =
    audience === "client" ? "Kunde" : audience === "public" ? "Offentlig" : "Intern";
  return <span className="text-[10px] text-fg-muted">{t}</span>;
}

/**
 * @param {{
 *   headingId?: string;
 *   toolbarTitle?: string;
 *   initialCategoryId?: string;
 *   initialAuthorId?: string;
 * }} props
 */
export function KbDirectory({
  headingId = "kb-directory-heading",
  toolbarTitle = "Artikelindeks",
  initialCategoryId,
  initialAuthorId,
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(initialCategoryId ?? "all");
  const [audience, setAudience] = useState("all");
  const [publication, setPublication] = useState("all");
  const [authorOnly, setAuthorOnly] = useState(initialAuthorId ?? "all");
  const [sort, setSort] = useState("updated");
  const [density, setDensity] = useState("list");

  const draftCount = useMemo(() => KNOWLEDGE_ARTICLES.filter((a) => !a.published).length, []);
  const pubCount = useMemo(() => KNOWLEDGE_ARTICLES.filter((a) => a.published).length, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = KNOWLEDGE_ARTICLES.filter((a) => {
      if (ql) {
        const blob = `${a.title} ${a.summary} ${a.bodyMd} ${a.tags.join(" ")} ${a.slug}`.toLowerCase();
        if (!blob.includes(ql)) return false;
      }
      if (category !== "all" && a.categoryId !== category) return false;
      if (audience !== "all" && a.audience !== audience) return false;
      if (publication === "published" && !a.published) return false;
      if (publication === "drafts" && a.published) return false;
      if (authorOnly !== "all" && a.authorId !== authorOnly) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "da");
      if (sort === "reading") return b.readingMinutes - a.readingMinutes;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return list;
  }, [q, category, audience, publication, authorOnly, sort]);

  return (
    <section
      id="kb-directory"
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
          {toolbarTitle}
        </h2>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {KNOWLEDGE_ARTICLES.length}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:max-w-[320px]">
          <label className="relative flex w-full min-w-0">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg titel, tags, slug, indhold…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-border-soft bg-surface-muted/30 px-3 py-2.5 md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Kategori</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
                category === "all"
                  ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                  : "border-border bg-surface-card text-fg-muted hover:border-border-soft hover:text-fg",
              )}
            >
              Alle
            </button>
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
                  category === c.id
                    ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                    : "border-border bg-surface-card text-fg-muted hover:border-border-soft hover:text-fg",
                )}
                style={
                  category === c.id
                    ? {
                        borderColor: `oklch(0.55 0.08 ${c.deptHue} / 0.55)`,
                      }
                    : undefined
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <PulseSegmentedControl
              size="sm"
              active={publication}
              onChange={setPublication}
              tabs={[
                { id: "all", label: "Alle" },
                { id: "published", label: "Publiceret", count: pubCount },
                { id: "drafts", label: "Kladder", count: draftCount },
              ]}
            />
            <PulseSegmentedControl
              size="sm"
              active={audience}
              onChange={setAudience}
              tabs={[
                { id: "all", label: "Alle m." },
                { id: "internal", label: "Intern" },
                { id: "client", label: "Kunde" },
                { id: "public", label: "Offentlig" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 font-sans text-[11px] text-fg-muted">
              <span className="text-[9px] uppercase tracking-wider text-fg-soft">Forfatter</span>
              <select
                value={authorOnly}
                onChange={(e) => setAuthorOnly(e.target.value)}
                className="h-7 max-w-[200px] rounded-md border border-border bg-surface-muted px-2 font-sans text-[11px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand"
              >
                <option value="all">Alle</option>
                {TEAM.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
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
      </div>

      {density === "cards" ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:p-4">
          {filtered.map((row) => (
            <KbGridCard key={row.slug} article={row} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID_LIST,
              )}
            >
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("title")}
              >
                Artikel {sort === "title" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span className="text-center">Kat</span>
              <span>Målgruppe</span>
              <span>Status</span>
              <span>Forfatter</span>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("updated")}
              >
                Opdateret {sort === "updated" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("reading")}
              >
                Læsetid {sort === "reading" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span />
            </div>

            {filtered.map((row, i) => {
              const cat = getKnowledgeCategoryById(row.categoryId);
              const author = TEAM.find((m) => m.id === row.authorId);

              return (
                <Link
                  key={row.slug}
                  href={`${routes.kb}/${row.slug}`}
                  className={cn(
                    "grid w-full gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    GRID_LIST,
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="font-sans text-[13px] font-medium leading-snug text-fg">{row.title}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 font-sans text-[11px] text-fg-quiet">{row.summary}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {row.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-border-soft px-1.5 py-0 text-[9px] text-fg-quiet"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <span
                      className="inline-flex min-w-[40px] justify-center rounded border border-border-soft bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-fg-soft"
                      style={
                        cat
                          ? {
                              borderColor: `oklch(0.55 0.08 ${cat.deptHue} / 0.45)`,
                            }
                          : undefined
                      }
                    >
                      {cat?.short ?? "—"}
                    </span>
                  </div>

                  <AudienceLabel audience={row.audience} />

                  <div>
                    {row.published ? (
                      <span className="inline-flex rounded border border-agency-ok-border bg-agency-ok-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-ok">
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex rounded border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-warn">
                        Kladde
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    {author ? (
                      <CrmAvatar label={author.avatar} hue={author.hue} className="size-5 shrink-0 text-[9px]" />
                    ) : null}
                    <span className="truncate font-sans text-[12px] text-fg-muted">{author?.name ?? row.authorId}</span>
                  </div>

                  <div className="text-[11px] tabular-nums text-fg-muted">
                    {formatIsoDateDa(row.updatedAt)}
                  </div>

                  <div className="text-[11px] tabular-nums text-fg-quiet">{row.readingMinutes} min</div>

                  <div className="flex items-center justify-end text-fg-quiet">
                    <PulseIconChevronRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center font-sans text-[13px] text-fg-muted">Ingen artikler matcher filtrene.</div>
      ) : null}
    </section>
  );
}
