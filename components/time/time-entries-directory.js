"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PulseIconChevronDown,
  PulseIconGrid,
  PulseIconList,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(54px,0.42fr)_minmax(42px,0.32fr)_minmax(128px,0.92fr)_minmax(118px,0.92fr)_minmax(38px,0.3fr)_minmax(160px,1.25fr)_minmax(72px,0.52fr)_minmax(80px,0.58fr)]";

/** @param {Record<string, unknown>} row */
function rowBillableWire(row) {
  const slug = typeof row.clientSlug === "string" ? row.clientSlug.trim() : "";
  return row.billable !== false && slug.length > 0;
}

/** @param {unknown} dur */
function durNum(dur) {
  const n = typeof dur === "number" ? dur : Number(dur);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * @param {{
 *   entriesToday?: Record<string, unknown>[];
 *   todayTotalCount?: number;
 *   headingId?: string;
 *   stampsHeading?: string;
 * }} props
 */
export function TimeEntriesDirectory({
  entriesToday = [],
  todayTotalCount,
  headingId = "time-entries-heading",
  stampsHeading = "Stempler i dag",
}) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("all");
  const [sort, setSort] = useState("time");
  const [density, setDensity] = useState("list");

  const billableCount = useMemo(() => entriesToday.filter((e) => rowBillableWire(e)).length, [entriesToday]);

  const rows = useMemo(() => {
    const list = [...entriesToday]
      .filter((raw) => {
        const ql = q.trim().toLowerCase();
        if (ql) {
          const hay = [
            raw.desc,
            raw.at,
            raw.clientName,
            raw.taskTitle,
            raw.id,
            raw.clientSlug,
            raw.taskKey,
          ]
            .map((x) => (typeof x === "string" ? x : x != null ? String(x) : ""))
            .join(" ")
            .toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        if (scope === "billable" && !rowBillableWire(raw)) return false;
        if (scope === "internal" && rowBillableWire(raw)) return false;
        return true;
      })
      .map((raw) => ({
        row: raw,
        bill: rowBillableWire(raw),
        cmpTime: typeof raw.workedAtIso === "string" ? raw.workedAtIso : "",
        cmpAt: typeof raw.at === "string" ? raw.at : "",
        durN: durNum(raw.durationMinutes),
      }));

    list.sort((a, b) => {
      if (sort === "time") {
        const t = String(a.cmpTime || "").localeCompare(String(b.cmpTime || ""));
        return t !== 0 ? t : String(a.cmpAt).localeCompare(String(b.cmpAt));
      }
      if (sort === "dur") return b.durN - a.durN;
      if (sort === "client") {
        const an = typeof a.row.clientName === "string" ? a.row.clientName : "";
        const bn = typeof b.row.clientName === "string" ? b.row.clientName : "";
        return an.localeCompare(bn, "da");
      }
      return 0;
    });

    return list;
  }, [entriesToday, q, scope, sort]);

  const totalShown = typeof todayTotalCount === "number" ? todayTotalCount : entriesToday.length;

  return (
    <section
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-2 md:px-4">
        <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
          {stampsHeading}
        </h2>
        <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 text-[11px] font-medium tabular-nums text-agency-brand">
          {rows.length} af {Math.max(rows.length, totalShown)}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end">
          <label className="relative flex min-w-0 max-w-[220px] flex-1 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Søg note, kunde, opgave…"
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>

          <PulseSegmentedControl
            size="sm"
            active={scope}
            onChange={setScope}
            tabs={[
              { id: "all", label: "Alle" },
              { id: "billable", label: "Billable", count: billableCount },
              {
                id: "internal",
                label: "Intern",
                count: entriesToday.length - billableCount,
              },
            ]}
          />

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

      {density === "cards" ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2 md:p-4 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {rows.map(({ row, bill }) => {
            const clientName = typeof row.clientName === "string" ? row.clientName : null;
            const clientSlug = typeof row.clientSlug === "string" && row.clientSlug.trim() ? row.clientSlug.trim() : null;
            const taskTitle = typeof row.taskTitle === "string" ? row.taskTitle : null;
            const taskKey =
              typeof row.taskKey === "string" && row.taskKey.trim() ? row.taskKey.trim() : null;
            const dept = typeof row.dept === "string" && row.dept ? row.dept : null;
            const deptCss = typeof row.deptColorVar === "string" ? row.deptColorVar : undefined;
            const at = typeof row.at === "string" ? row.at : "—";
            const id = typeof row.id === "string" ? row.id : "unknown";
            const dm = durNum(row.durationMinutes);
            const desc = typeof row.desc === "string" ? row.desc : "";
            return (
              <article
                key={id}
                className={cn(
                  "flex flex-col rounded-2xl border border-border-soft bg-surface-muted/35 p-3.5",
                  bill ? "" : "border-dashed opacity-95",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] tabular-nums text-fg-muted">{at}</p>
                    <p className="mt-1 text-[18px] font-semibold tabular-nums text-agency-brand">
                      {dm} <span className="text-[12px] font-medium text-fg-soft">min</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      bill ?
                        "border border-agency-ok-border bg-agency-brand-soft text-agency-ok"
                      : "border border-border text-fg-quiet",
                    )}
                  >
                    {bill ? "Billable" : "Intern"}
                  </span>
                </div>
                {clientSlug && clientName ?
                  <Link
                    href={`${routes.clients}/${encodeURIComponent(clientSlug)}`}
                    className="mt-3 truncate font-sans text-[13px] font-semibold text-fg hover:text-agency-brand hover:underline"
                  >
                    {clientName}
                  </Link>
                : <p className="mt-3 font-sans text-[13px] font-medium text-fg-muted">— Intern / overhead</p>}
                {taskKey && taskTitle ?
                  <Link
                    href={`${routes.tasks}/${encodeURIComponent(taskKey)}`}
                    className="mt-1 line-clamp-2 font-sans text-[12px] text-agency-brand hover:underline"
                  >
                    {taskTitle}
                  </Link>
                : <p className="mt-1 font-sans text-[12px] text-fg-quiet">Ingen opgave linket</p>}
                {dept ?
                  <p
                    className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fg"
                    {...(deptCss ? { style: { color: deptCss } } : {})}
                  >
                    {dept.slice(0, 4)}
                  </p>
                : null}
                <p className="mt-2 border-t border-border-soft pt-2 font-sans text-[12px] leading-snug text-fg-muted">
                  {desc}
                </p>
                <Link
                  href={`${routes.time}/${encodeURIComponent(typeof row.mongoId === "string" && row.mongoId.trim() ? row.mongoId.trim() : id)}`}
                  className="mt-2 text-[10px] text-agency-brand hover:underline"
                >
                  Åbn registrering
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className={cn(
                "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
                "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
                GRID,
              )}
            >
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("time")}
              >
                Kl. {sort === "time" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("dur")}
              >
                Min {sort === "dur" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <button
                type="button"
                className="text-left font-[inherit] text-[inherit] hover:text-fg"
                onClick={() => setSort("client")}
              >
                Kunde {sort === "client" ? <PulseIconChevronDown className="inline opacity-70" /> : null}
              </button>
              <span>Opgave</span>
              <span className="text-center">Afd.</span>
              <span>Beskrivelse</span>
              <span className="text-center">Åbn</span>
              <span>Type</span>
            </div>

            {rows.map(({ row, bill }, i) => {
              const clientName = typeof row.clientName === "string" ? row.clientName : null;
              const clientSlug =
                typeof row.clientSlug === "string" && row.clientSlug.trim() ? row.clientSlug.trim() : null;
              const taskTitle = typeof row.taskTitle === "string" ? row.taskTitle : null;
              const taskKey =
                typeof row.taskKey === "string" && row.taskKey.trim() ? row.taskKey.trim() : null;
              const dept = typeof row.dept === "string" && row.dept ? row.dept : null;
              const deptCss = typeof row.deptColorVar === "string" ? row.deptColorVar : undefined;
              const at = typeof row.at === "string" ? row.at : "—";
              const id = typeof row.id === "string" ? row.id : "unknown";
              const dm = durNum(row.durationMinutes);
              const desc = typeof row.desc === "string" ? row.desc : "";
              const detailId = typeof row.mongoId === "string" && row.mongoId.trim() ? row.mongoId.trim() : id;
              return (
                <div
                  key={`${id}-${i}`}
                  className={cn(
                    "grid w-full gap-3 px-3 py-2 md:px-4 md:py-2.5",
                    GRID,
                    i < rows.length - 1 && "border-b border-border-soft",
                    !bill && "bg-surface-muted/15",
                  )}
                >
                  <span className="text-[12px] tabular-nums text-fg">{at}</span>
                  <span className="text-[12px] font-semibold tabular-nums text-agency-brand">{dm}</span>
                  <div className="min-w-0">
                    {clientSlug && clientName ?
                      <Link
                        href={`${routes.clients}/${encodeURIComponent(clientSlug)}`}
                        className="truncate font-sans text-[12px] font-medium text-fg hover:text-agency-brand hover:underline"
                      >
                        {clientName}
                      </Link>
                    : <span className="font-sans text-[12px] text-fg-muted">Intern</span>}
                  </div>
                  <div className="min-w-0">
                    {taskKey && taskTitle ?
                      <Link
                        href={`${routes.tasks}/${encodeURIComponent(taskKey)}`}
                        className="line-clamp-2 font-sans text-[12px] text-agency-brand hover:underline"
                      >
                        {taskTitle}
                      </Link>
                    : <span className="font-sans text-[12px] text-fg-quiet">—</span>}
                  </div>
                  <div className="flex items-center justify-center">
                    {dept ?
                      <span
                        className="text-[10px] font-semibold text-fg"
                        {...(deptCss ? { style: { color: deptCss } } : {})}
                      >
                        {dept.slice(0, 4)}
                      </span>
                    : <span className="text-fg-quiet">—</span>}
                  </div>
                  <p className="line-clamp-2 min-w-0 font-sans text-[12px] leading-snug text-fg-muted">{desc}</p>
                  <div className="flex justify-center">
                    <Link
                      href={`${routes.time}/${encodeURIComponent(detailId)}`}
                      className="text-[11px] text-agency-brand hover:underline"
                    >
                      Post
                    </Link>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        bill ? "border-agency-ok-border text-agency-ok" : "border-border text-fg-quiet",
                      )}
                    >
                      {bill ? "Fakt." : "Int."}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
