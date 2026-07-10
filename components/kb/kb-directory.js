"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { KbAuthorFilter, defaultKbAuthorSelection } from "@/components/kb/kb-author-filter";
import { KbAuthorChip } from "@/components/kb/kb-author-chip";
import { KbGridCard } from "@/components/kb/kb-grid-card";
import {
  KbMultiSelectFilter,
  kbMatchesMultiFilter,
  kbMatchesTagFilter,
} from "@/components/kb/kb-multi-select-filter";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { kbArticleHref } from "@/config/routes";
import { formatIsoDateDa } from "@/lib/crm/format-da";
import { KNOWLEDGE_SECTIONS } from "@/lib/crm/knowledge-data";
import { getKnowledgeSectionById } from "@/lib/crm/knowledge-data";
import { isSystemKnowledgeTag } from "@/lib/crm/knowledge-utils";
import { cn } from "@/lib/utils";

const GRID_LIST =
  "grid-cols-[minmax(180px,2fr)_minmax(120px,0.9fr)_minmax(72px,0.45fr)_minmax(52px,0.35fr)_minmax(70px,0.5fr)_minmax(88px,0.6fr)_28px]";

/**
 * @param {{
 *   articles: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   allArticles?: import("@/lib/crm/knowledge-utils").KnowledgeArticleView[];
 *   initialSectionId?: string;
 *   initialAuthorId?: string;
 *   initialTag?: string;
 *   compact?: boolean;
 *   headingId?: string;
 * }} props
 */
export function KbDirectory({
  articles,
  allArticles,
  initialSectionId,
  initialAuthorId,
  initialTag,
  compact = false,
  headingId = "kb-directory-heading",
}) {
  const pool = allArticles ?? articles;

  const sectionOptions = useMemo(
    () => KNOWLEDGE_SECTIONS.map((s) => ({ id: s.id, label: s.name, prefix: s.icon })),
    [],
  );
  const sectionKeys = useMemo(() => new Set(sectionOptions.map((s) => s.id)), [sectionOptions]);

  const tagOptions = useMemo(() => {
    const tags = new Set();
    for (const a of pool) {
      for (const t of a.tags) {
        if (!isSystemKnowledgeTag(t)) tags.add(t);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "da")).map((t) => ({ id: t, label: t }));
  }, [pool]);
  const tagKeys = useMemo(() => new Set(tagOptions.map((t) => t.id)), [tagOptions]);

  const authorOptions = useMemo(() => {
    /** @type {Map<string, { id: string; name: string; avatar: string; hue: number; image?: string }>} */
    const map = new Map();
    for (const a of pool) {
      if (!a.authorId) continue;
      if (a.author) {
        map.set(a.authorId, {
          id: a.author.id,
          name: a.author.name,
          avatar: a.author.avatar,
          hue: a.author.hue,
          image: a.author.image,
        });
      } else {
        map.set(a.authorId, {
          id: a.authorId,
          name: a.authorId,
          avatar: a.authorId.slice(0, 2),
          hue: 220,
        });
      }
    }
    return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, "da"));
  }, [pool]);
  const authorKeys = useMemo(() => new Set(authorOptions.map((a) => a.id)), [authorOptions]);

  const [q, setQ] = useState("");
  const [publication, setPublication] = useState("all");
  const [sort, setSort] = useState("updated");
  const [density, setDensity] = useState(compact ? "list" : "list");
  const [selectedSections, setSelectedSections] = useState(() =>
    initialSectionId && sectionKeys.has(initialSectionId) ? new Set([initialSectionId]) : new Set(sectionKeys),
  );
  const [selectedAuthors, setSelectedAuthors] = useState(() =>
    initialAuthorId && authorKeys.has(initialAuthorId) ?
      new Set([initialAuthorId])
    : defaultKbAuthorSelection(authorOptions),
  );
  const [selectedTags, setSelectedTags] = useState(() =>
    initialTag && tagKeys.has(initialTag) ? new Set([initialTag]) : new Set(tagKeys),
  );

  useEffect(() => {
    if (initialSectionId && sectionKeys.has(initialSectionId)) {
      setSelectedSections(new Set([initialSectionId]));
    } else if (!initialSectionId) {
      setSelectedSections(new Set(sectionKeys));
    }
  }, [initialSectionId, sectionKeys]);

  useEffect(() => {
    if (initialAuthorId && authorKeys.has(initialAuthorId)) {
      setSelectedAuthors(new Set([initialAuthorId]));
    } else if (!initialAuthorId && authorOptions.length > 0) {
      setSelectedAuthors(defaultKbAuthorSelection(authorOptions));
    }
  }, [initialAuthorId, authorKeys, authorOptions]);

  useEffect(() => {
    if (initialTag && tagKeys.has(initialTag)) {
      setSelectedTags(new Set([initialTag]));
    } else if (!initialTag && tagOptions.length > 0) {
      setSelectedTags(new Set(tagKeys));
    }
  }, [initialTag, tagKeys, tagOptions]);

  useEffect(() => {
    if (!initialSectionId && !initialAuthorId && !initialTag) return;
    const el = document.getElementById("kb-directory");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialSectionId, initialAuthorId, initialTag]);

  const pubCount = useMemo(() => pool.filter((a) => a.published && !a.archived).length, [pool]);
  const draftCount = useMemo(() => pool.filter((a) => !a.published && !a.archived).length, [pool]);
  const archivedCount = useMemo(() => pool.filter((a) => a.archived).length, [pool]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = articles.filter((a) => {
      if (ql) {
        const blob = `${a.title} ${a.summary} ${a.bodyMd} ${a.tags.join(" ")} ${a.slug} ${a.author?.name ?? ""}`.toLowerCase();
        if (!blob.includes(ql)) return false;
      }

      if (publication === "archived") {
        if (!a.archived) return false;
      } else {
        if (a.archived) return false;
        if (publication === "published" && !a.published) return false;
        if (publication === "drafts" && a.published) return false;
      }

      const sectionKey = a.sectionId || "";
      if (sectionKey && !kbMatchesMultiFilter(sectionKey, selectedSections, sectionKeys)) return false;
      if (!sectionKey && selectedSections.size < sectionKeys.size) return false;

      if (a.authorId && !kbMatchesMultiFilter(a.authorId, selectedAuthors, authorKeys)) return false;

      const userTags = a.tags.filter((t) => !isSystemKnowledgeTag(t));
      if (!kbMatchesTagFilter(userTags, selectedTags, tagKeys)) return false;

      return true;
    });

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "da");
      if (sort === "reading") return b.readingMinutes - a.readingMinutes;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return list;
  }, [
    articles,
    q,
    publication,
    sort,
    selectedSections,
    sectionKeys,
    selectedAuthors,
    authorKeys,
    selectedTags,
    tagKeys,
  ]);

  return (
    <section id="kb-directory" className="tally-panel" aria-labelledby={headingId}>
      <div className="relative z-10 flex flex-col gap-3 overflow-visible border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h2 id={headingId} className="shrink-0 font-sans text-sm font-semibold text-fg">
          Alle artikler
        </h2>
        <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {filtered.length} af {articles.length}
        </span>

        <div className="flex min-w-0 w-full flex-1 flex-col gap-2 md:ml-auto md:w-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 w-full shrink-0 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg artikel…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <KbMultiSelectFilter
              options={sectionOptions}
              selected={selectedSections}
              onChange={setSelectedSections}
              allSelectedLabel="Alle sektioner"
              countLabel={(n) => `${n} sektioner`}
              emptyLabel="Ingen sektioner"
            />
            {authorOptions.length > 0 ?
              <KbAuthorFilter authors={authorOptions} selected={selectedAuthors} onChange={setSelectedAuthors} />
            : null}
            {tagOptions.length > 0 ?
              <KbMultiSelectFilter
                options={tagOptions}
                selected={selectedTags}
                onChange={setSelectedTags}
                allSelectedLabel="Alle tags"
                countLabel={(n) => `${n} tags`}
                emptyLabel="Ingen tags"
              />
            : null}

            <PulseSegmentedControl
              size="sm"
              active={publication}
              onChange={setPublication}
              tabs={[
                { id: "all", label: "Alle" },
                { id: "published", label: "Live", count: pubCount },
                { id: "drafts", label: "Kladder", count: draftCount },
                { id: "archived", label: "Arkiv", count: archivedCount },
              ]}
            />
          </div>

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

      {density === "cards" ?
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:p-4">
          {filtered.map((row) => (
            <KbGridCard key={row.slug} article={row} />
          ))}
        </div>
      : <div className="overflow-x-auto overflow-y-visible">
          <div className="min-w-[860px]">
            <div
              className={cn(
                "grid gap-2 border-b border-border bg-surface-muted/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID_LIST,
              )}
            >
              <button type="button" className="text-left" onClick={() => setSort("title")}>
                Artikel {sort === "title" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Forfatter</span>
              <span>Sektion</span>
              <span>Status</span>
              <button type="button" className="text-left" onClick={() => setSort("updated")}>
                Opdat. {sort === "updated" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button type="button" className="text-left" onClick={() => setSort("reading")}>
                Min {sort === "reading" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span />
            </div>

            {filtered.map((row, i) => {
              const section = getKnowledgeSectionById(row.sectionId);

              return (
                <Link
                  key={row.slug}
                  href={kbArticleHref(row.slug)}
                  className={cn(
                    "grid w-full gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-muted md:px-4 md:py-2.5",
                    GRID_LIST,
                    i < filtered.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {row.icon ?
                        <span className="text-[13px]">{row.icon}</span>
                      : null}
                      <span className="font-sans text-[13px] font-medium leading-snug text-fg">{row.title}</span>
                    </div>
                    {!compact ?
                      <div className="mt-0.5 line-clamp-1 font-sans text-[11px] text-fg-quiet">{row.summary}</div>
                    : null}
                  </div>
                  <div className="min-w-0">
                    <KbAuthorChip author={row.author} authorId={row.authorId} size="sm" />
                  </div>
                  <span className="truncate text-[10px] font-medium text-fg-muted">{section?.name ?? "—"}</span>
                  <div>
                    {row.archived ?
                      <span className="inline-flex rounded border border-border bg-surface-muted px-1.5 py-0 text-[9px] font-semibold uppercase text-fg-muted">
                        Arkiv
                      </span>
                    : row.published ?
                      <span className="inline-flex rounded border border-agency-ok-border bg-agency-ok-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-ok">
                        Live
                      </span>
                    : <span className="inline-flex rounded border border-agency-warn-border bg-agency-warn-soft px-1.5 py-0 text-[9px] font-semibold uppercase text-agency-warn">
                        Kladde
                      </span>}
                  </div>
                  <div className="text-[11px] tabular-nums text-fg-muted">{formatIsoDateDa(row.updatedAt)}</div>
                  <div className="text-[11px] tabular-nums text-fg-quiet">{row.readingMinutes}m</div>
                  <div className="flex justify-end text-fg-quiet">
                    <PulseIconChevronRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      }

      {filtered.length === 0 ?
        <div className="px-4 py-10 text-center font-sans text-[13px] text-fg-muted">Ingen artikler matcher filtrene.</div>
      : null}
    </section>
  );
}
