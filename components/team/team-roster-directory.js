"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { LoadIndexFormulaHintContent } from "@/components/workload/load-index-formula-hint";
import {
  PulseIconChevronDown,
  PulseIconChevronRight,
  PulseIconSearch,
} from "@/components/pulse/pulse-icons";
import { PulseSegmentedControl } from "@/components/pulse/pulse-segmented-control";
import { PulseUtilBar } from "@/components/pulse/pulse-util-bar";
import { memberProfileHref, routes } from "@/config/routes";
import { useDataSource } from "@/components/crm/use-data-source";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { DEPARTMENTS as DEMO_DEPARTMENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

const GRID =
  "grid-cols-[minmax(220px,2.4fr)_minmax(52px,0.48fr)_minmax(72px,0.58fr)_minmax(40px,0.36fr)_minmax(40px,0.36fr)_minmax(52px,0.46fr)_minmax(120px,0.95fr)_36px]";

const rosterHeaderHintClass =
  "font-[inherit] text-[inherit] underline decoration-dotted decoration-border/80 underline-offset-2 hover:text-fg";

/**
 * @param {{
 *   label: import('react').ReactNode;
 *   title: string;
 *   content?: import('react').ReactNode;
 *   children?: import('react').ReactNode;
 *   align?: "start" | "center";
 *   className?: string;
 * }} props
 */
function RosterHeaderHint({ label, title, content, children, align = "center", className }) {
  return (
    <CrmHoverPopover
      align={align}
      title={title}
      content={
        content ?? (
          <p className="font-sans text-[12px] leading-snug text-fg-muted">{children}</p>
        )
      }
      triggerClassName={cn(rosterHeaderHintClass, className)}
    >
      {label}
    </CrmHoverPopover>
  );
}

/** Synthetic roster filter for members without a department / discipline. */
export const UNASSIGNED_DISCIPLINE_ID = "unassigned";

/**
 * @param {{ dept?: string; disciplineKeys?: string[] }} member
 */
function memberDisciplineKeys(member) {
  const keys = Array.isArray(member.disciplineKeys) ? member.disciplineKeys.filter(Boolean) : [];
  if (keys.length) return keys;
  const dept = String(member.dept ?? "").trim();
  return dept ? [dept] : [];
}

/**
 * @param {{ dept?: string; disciplineKeys?: string[] }} member
 */
function memberHasNoDiscipline(member) {
  return memberDisciplineKeys(member).length === 0;
}

/**
 * @param {{ dept?: string; disciplineKeys?: string[] }} member
 */
function memberDeptSelectValue(member) {
  return memberDisciplineKeys(member)[0] ?? "";
}

const rosterDeptSelectClass = cn(
  "h-7 w-full min-w-0 rounded-md border border-border bg-surface-muted px-1.5",
  "font-sans text-[11px] font-semibold text-fg",
  "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/**
 * @param {{
 *   teamRows: ReturnType<typeof import('@/lib/crm/workload-utils').buildTeamWorkloadRows>;
 *   departments?: { id: string; name: string; short: string; color?: string; capacity?: number }[];
 *   headingId?: string;
 *   initialDeptId?: string;
 *   onMemberDeptUpdated?: () => void;
 * }} props
 */
export function TeamRosterDirectory({
  teamRows,
  departments: departmentsProp,
  headingId = "team-roster-heading",
  initialDeptId,
  onMemberDeptUpdated,
}) {
  const dataSource = useDataSource();
  const departments =
    Array.isArray(departmentsProp) && departmentsProp.length ?
      departmentsProp
    : dataSource === "demo" ?
      DEMO_DEPARTMENTS
    : [];
  const [q, setQ] = useState("");
  const [dept, setDept] = useState(initialDeptId ?? "all");
  const [sort, setSort] = useState("load");
  const [rows, setRows] = useState(teamRows);
  const [savingMemberId, setSavingMemberId] = useState(/** @type {string | null} */ (null));
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setRows(teamRows);
  }, [teamRows]);

  const canEditDept = dataSource === "database";

  /** @param {string} memberId @param {string} departmentKey */
  const handleDeptAssign = useCallback(
    async (memberId, departmentKey) => {
      if (!canEditDept) return;

      const nextDept = departmentKey.trim();
      /** @type {typeof rows | null} */
      let revertSnapshot = null;

      setSaveError(null);
      setRows((current) => {
        revertSnapshot = current;
        return current.map((row) =>
          row.member.id === memberId ?
            {
              ...row,
              member: {
                ...row.member,
                dept: nextDept,
                disciplineKeys: nextDept ? [nextDept] : [],
              },
            }
          : row,
        );
      });
      setSavingMemberId(memberId);

      try {
        const qs = databaseApiQuery();
        const res = await fetch(`/api/team/${encodeURIComponent(memberId)}?${qs}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ departmentKey: nextDept || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke gemme afdeling");

        if (data?.member && typeof data.member === "object") {
          const updated = /** @type {{ id: string; dept?: string; disciplineKeys?: string[] }} */ (data.member);
          setRows((current) =>
            current.map((row) =>
              row.member.id === memberId ?
                {
                  ...row,
                  member: {
                    ...row.member,
                    dept: String(updated.dept ?? ""),
                    disciplineKeys: Array.isArray(updated.disciplineKeys) ? updated.disciplineKeys : [],
                  },
                }
              : row,
            ),
          );
        }

        onMemberDeptUpdated?.();
      } catch (err) {
        if (revertSnapshot) setRows(revertSnapshot);
        setSaveError(err instanceof Error ? err.message : "Fejl ved gem af afdeling");
      } finally {
        setSavingMemberId(null);
      }
    },
    [canEditDept, onMemberDeptUpdated],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (dept === UNASSIGNED_DISCIPLINE_ID) {
        if (!memberHasNoDiscipline(r.member)) return false;
      } else if (dept !== "all") {
        const keys = memberDisciplineKeys(r.member);
        if (!keys.includes(dept)) return false;
      }
      if (!ql) return true;
      const d = departments.find((x) => x.id === r.member.dept);
      const hay = `${r.member.name} ${r.member.role} ${d?.name ?? ""}`.toLowerCase();
      return hay.includes(ql);
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "name") return a.member.name.localeCompare(b.member.name, "da");
      if (sort === "open") return b.openCount - a.openCount;
      return b.loadIndex - a.loadIndex;
    });
    return list;
  }, [rows, q, dept, sort, departments]);

  return (
    <section
      id="team-roster"
      className="tally-panel overflow-hidden"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 md:flex-row md:flex-wrap md:items-start md:justify-between md:px-4 md:py-4">
        <div className="max-w-xl">
          <h2 id={headingId} className="font-sans text-sm font-semibold text-fg">
            Rosterindeks
          </h2>
          <p className="mt-1 font-sans text-[11px] leading-snug text-fg-muted">
            Medarbejdere med afdeling og belægning fra åbne board-opgaver — vælg afdeling i listen for at opdatere med det
            samme. Brug <span className="text-fg-quiet">?dept=</span> fra Workload-filter.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-none md:w-auto md:flex-1 md:flex-row md:justify-end md:gap-2">
          <label className="relative flex min-w-0 max-w-full flex-1 md:max-w-[280px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconSearch size={14} />
            </span>
            <input
              type="search"
              placeholder="Navn, rolle, disciplin…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cn(
                "h-8 w-full rounded-md border border-border bg-surface-muted py-1 pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            />
          </label>
          <PulseSegmentedControl
            size="sm"
            active={sort}
            onChange={setSort}
            tabs={[
              { id: "load", label: "Belægning" },
              { id: "open", label: "Åbne opgaver" },
              { id: "name", label: "Navn" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-soft bg-surface-muted/30 px-3 py-2 md:px-4">
        <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Disciplin</span>
        <button
          type="button"
          onClick={() => setDept("all")}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
            dept === "all"
              ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-border bg-surface-card text-fg-muted hover:text-fg",
          )}
        >
          Alle
        </button>
        <button
          type="button"
          title="Ikke tildelt disciplin"
          onClick={() => setDept(UNASSIGNED_DISCIPLINE_ID)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
            dept === UNASSIGNED_DISCIPLINE_ID
              ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-border bg-surface-card text-fg-muted hover:text-fg",
          )}
        >
          Ikke tildelt
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDept(d.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium transition-colors",
              dept === d.id
                ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                : "border-border bg-surface-card text-fg-muted hover:text-fg",
            )}
          >
            {d.short}
          </button>
        ))}
      </div>

      {saveError ? (
        <p className="border-b border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad">
          {saveError}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <div
            className={cn(
              "grid gap-3 border-b border-border bg-surface-muted/90 px-3 py-2",
              "text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft md:px-4",
              GRID,
            )}
          >
            <span>Medarbejder</span>
            <span>Afd.</span>
            <span className="inline-flex items-center justify-center gap-0.5">
              <RosterHeaderHint
                align="center"
                title="Åbne opgaver"
                className="inline-flex"
                label="Åbne opgaver"
              >
                Antal opgaver på personen der ikke er afsluttet (todo, i gang, review eller blokeret).
              </RosterHeaderHint>
              <button
                type="button"
                className="text-fg-soft hover:text-fg"
                aria-label="Sortér efter åbne opgaver"
                onClick={() => setSort("open")}
              >
                <PulseIconChevronDown className={cn("inline", sort === "open" ? "opacity-100" : "opacity-35")} />
              </button>
            </span>
            <RosterHeaderHint
              align="center"
              title="HP — høj prioritet"
              className="block text-center"
              label="HP"
            >
              Antal åbne opgaver med høj prioritet.
            </RosterHeaderHint>
            <RosterHeaderHint
              align="center"
              title="Økr. — overskredet"
              className="block text-center"
              label="Økr."
            >
              Antal åbne opgaver hvor deadline er passeret.
            </RosterHeaderHint>
            <span className="inline-flex items-center gap-0.5">
              <RosterHeaderHint
                align="start"
                title="Index — belastning"
                label="Index"
                content={<LoadIndexFormulaHintContent />}
              />
              <button
                type="button"
                className="text-fg-soft hover:text-fg"
                aria-label="Sortér efter belastningsindex"
                onClick={() => setSort("load")}
              >
                <PulseIconChevronDown className={cn("inline", sort === "load" ? "opacity-100" : "opacity-35")} />
              </button>
            </span>
            <RosterHeaderHint
              align="start"
              title="Workload"
              className="hidden sm:inline"
              label="Workload"
              content={<LoadIndexFormulaHintContent includeBarNote />}
            />
            <span />
          </div>

          {filtered.map((r, i) => {
            const deptValue = memberDeptSelectValue(r.member);
            const d = departments.find((x) => x.id === deptValue);
            const extraDisciplines = Array.isArray(r.member.disciplineKeys)
              ? r.member.disciplineKeys.filter((k) => k && k !== deptValue)
              : [];
            const deptShort = d?.short ?? (deptValue || "—");
            const deptTitle =
              extraDisciplines.length > 0 ? `${r.member.disciplineKeys?.join(", ")}` : d?.name;
            return (
              <div
                key={r.member.id}
                className={cn(
                  "grid gap-3 px-3 py-2 md:px-4 md:py-2.5",
                  GRID,
                  i < filtered.length - 1 && "border-b border-border-soft",
                  r.overdueCount > 0 && "bg-agency-bad-soft/10",
                  r.member.isMe && "bg-agency-brand-soft/10",
                )}
              >
                <Link
                  href={memberProfileHref(r.member)}
                  className="flex min-w-0 items-center gap-2 transition-colors hover:opacity-90"
                >
                  <CrmAvatar
                    label={r.member.avatar}
                    src={r.member.image}
                    hue={r.member.hue}
                    className="size-8 text-[11px]"
                  />
                  <div className="min-w-0">
                    <span className="truncate font-sans text-[13px] font-semibold text-fg">{r.member.name}</span>
                    <div className="text-[10px] text-fg-quiet">
                      {r.member.weeklyHours} h/uge
                      {r.member.isMe ? (
                        <span className="text-agency-brand"> · dig</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
                {canEditDept ? (
                  <select
                    value={deptValue}
                    disabled={savingMemberId === r.member.id}
                    title={deptTitle}
                    aria-label={`Afdeling for ${r.member.name}`}
                    onChange={(e) => void handleDeptAssign(r.member.id, e.target.value)}
                    className={rosterDeptSelectClass}
                    style={{ color: d?.color ?? "var(--fg-muted)" }}
                  >
                    <option value="">Ikke tildelt</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.short} · {dep.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="self-center text-[11px] font-semibold tabular-nums"
                    style={{ color: d?.color ?? "var(--fg-muted)" }}
                    title={deptTitle}
                  >
                    {extraDisciplines.length > 0 ? `${deptShort} +${extraDisciplines.length}` : deptShort}
                  </span>
                )}
                <span className="self-center text-center text-[11px] tabular-nums text-fg">{r.openCount}</span>
                <span className="self-center text-center text-[11px] tabular-nums text-fg">{r.highCount}</span>
                <span
                  className={cn(
                    "self-center text-center text-[11px] tabular-nums",
                    r.overdueCount > 0 ? "text-agency-bad" : "text-fg-muted",
                  )}
                >
                  {r.overdueCount}
                </span>
                <span className="self-center text-[12px] font-semibold tabular-nums text-fg">{r.loadIndex}%</span>
                <PulseUtilBar
                  hours={r.loadIndex}
                  budget={100}
                  className="hidden max-w-[120px] self-center sm:block"
                />
                <Link
                  href={memberProfileHref(r.member)}
                  className="flex items-center justify-end self-center text-fg-quiet transition-colors hover:text-fg"
                  aria-label={`Åbn profil for ${r.member.name}`}
                >
                  <PulseIconChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center font-sans text-[13px] text-fg-muted">Ingen matcher dét filter.</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-[10px] text-fg-soft">
          {filtered.length} af {rows.length}
        </span>
        <Link href={routes.workload} className="font-sans text-[11px] font-medium text-agency-brand hover:underline">
          Disciplin-matrix i Workload →
        </Link>
      </div>
    </section>
  );
}
