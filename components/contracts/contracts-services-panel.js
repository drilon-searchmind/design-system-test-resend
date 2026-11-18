"use client";

import { useCallback, useEffect, useState } from "react";

import { useDataSource } from "@/components/crm/use-data-source";
import { SERVICE_BILLING_OPTIONS } from "@/lib/contracts/contract-services";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

const CELL_INPUT =
  "h-8 w-full rounded-md border border-border bg-canvas px-2 font-sans text-[12.5px] text-fg placeholder:text-fg-quiet outline-none focus-visible:border-agency-brand-border focus-visible:ring-2 focus-visible:ring-agency-brand/40 disabled:opacity-60";
const BRAND_BUTTON =
  "inline-flex h-8 items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[11px] font-medium text-agency-brand transition-opacity hover:opacity-90 disabled:opacity-50";
const GRID =
  "grid-cols-[minmax(160px,1.6fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_96px_minmax(150px,auto)]";

/**
 * @typedef {object} ServiceRow
 * @property {string} id
 * @property {string} key
 * @property {string} name
 * @property {"monthly" | "one_off" | "annual"} billing
 * @property {string} departmentKey
 * @property {number} [defaultAmount]
 * @property {boolean} active
 * @property {number} sortOrder
 */

/** @param {string} raw */
function parseAmount(raw) {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** @param {number | undefined} n */
function amountText(n) {
  return typeof n === "number" && n > 0 ? n.toLocaleString("da-DK") : "";
}

/**
 * @param {Response} res
 * @param {string} fallback
 */
async function readJson(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : fallback);
  return data;
}

/**
 * Admin-katalog over servicelinjer der kan vælges i send-dialogen.
 * @param {{
 *   departments?: Array<{ key: string; name: string }>;
 *   onMutate?: () => void;
 * }} props
 */
export function ContractsServicesPanel({ departments = [], onMutate }) {
  const dataSource = useDataSource();
  const [rows, setRows] = useState(/** @type {ServiceRow[]} */ ([]));
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [draft, setDraft] = useState({
    name: "",
    key: "",
    billing: "monthly",
    departmentKey: "",
    defaultAmount: "",
  });

  const load = useCallback(async () => {
    if (dataSource === "demo") {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/contract-services?all=1&${qs}`, { cache: "no-store" });
      const data = await readJson(res, "Kunne ikke hente services");
      setRows(Array.isArray(data.services) ? data.services : []);
      setIsFallback(Boolean(data.isFallback));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  /**
   * @param {string} tag
   * @param {() => Promise<unknown>} fn
   */
  const run = useCallback(
    async (tag, fn) => {
      setSaving(tag);
      setError(null);
      try {
        await fn();
        await load();
        onMutate?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fejl");
      } finally {
        setSaving(null);
      }
    },
    [load, onMutate],
  );

  const qs = () => databaseApiQuery();

  const seed = () =>
    run("seed", async () => {
      const res = await fetch(`/api/contract-services?${qs()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      await readJson(res, "Kunne ikke gemme standardlisten");
    });

  const create = () =>
    run("create", async () => {
      const res = await fetch(`/api/contract-services?${qs()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          key: draft.key.trim() || undefined,
          billing: draft.billing,
          departmentKey: draft.departmentKey,
          defaultAmount: parseAmount(draft.defaultAmount),
        }),
      });
      await readJson(res, "Kunne ikke oprette service");
      setDraft({ name: "", key: "", billing: "monthly", departmentKey: "", defaultAmount: "" });
    });

  /**
   * @param {string} id
   * @param {Record<string, unknown>} patch
   * @param {string} [tag]
   */
  const update = (id, patch, tag = id) =>
    run(tag, async () => {
      const res = await fetch(`/api/contract-services/${encodeURIComponent(id)}?${qs()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await readJson(res, "Kunne ikke gemme service");
    });

  /** @param {ServiceRow} row */
  const remove = (row) => {
    if (
      !window.confirm(
        `Slet «${row.name}»? Sendte kontrakter beholder linjen. Vil du blot skjule den, så gør den inaktiv i stedet.`,
      )
    )
      return;
    void run(`delete-${row.id}`, async () => {
      const res = await fetch(`/api/contract-services/${encodeURIComponent(row.id)}?${qs()}`, {
        method: "DELETE",
      });
      await readJson(res, "Kunne ikke slette service");
    });
  };

  /**
   * @param {number} index
   * @param {-1 | 1} dir
   */
  const move = (index, dir) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    // Byt plads; ens sortOrder (fx efter import) spredes ud så rækkefølgen bliver entydig.
    const aOrder = b.sortOrder === a.sortOrder ? a.sortOrder + dir : b.sortOrder;
    void run(`move-${a.id}`, async () => {
      await Promise.all([
        fetch(`/api/contract-services/${encodeURIComponent(a.id)}?${qs()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: aOrder }),
        }).then((r) => readJson(r, "Kunne ikke flytte")),
        fetch(`/api/contract-services/${encodeURIComponent(b.id)}?${qs()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: a.sortOrder }),
        }).then((r) => readJson(r, "Kunne ikke flytte")),
      ]);
    });
  };

  const editable = dataSource !== "demo" && !isFallback;
  const activeCount = rows.filter((r) => r.active).length;

  return (
    <section className="tally-panel overflow-hidden" aria-labelledby="contract-services-heading">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="contract-services-heading" className="font-sans text-sm font-semibold text-fg">
            Services
          </h2>
          <p className="mt-1 max-w-2xl font-sans text-[11px] text-fg-muted">
            Servicelinjerne der kan vælges, når en kontrakt sendes. Løbende linjer lægges på kundens
            servicebudget for afdelingen; engangslinjer registreres som engangsopsalg (web-afdelingen
            også som engangs-web); årlige linjer lægges på kundens serviceaftale og tæller som 1/12
            pr. måned i kontrakternes MRR.
          </p>
        </div>
        <span className="self-start rounded-md border border-border bg-surface-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
          {activeCount} aktive
        </span>
      </div>

      {error ? (
        <p className="border-b border-agency-bad-border bg-agency-bad-soft px-4 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      ) : null}

      {dataSource === "demo" ? (
        <p className="px-4 py-6 font-sans text-[12px] text-fg-muted">
          Servicekataloget kræver database-kilde. Demo bruger standardlisten (afdelinger + Web engangs).
        </p>
      ) : loading && !rows.length ? (
        <p className="px-4 py-6 font-sans text-[12px] text-fg-muted">Indlæser services…</p>
      ) : (
        <>
          {isFallback ? (
            <div className="flex flex-col gap-2 border-b border-border-soft bg-agency-brand-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-sans text-[12px] leading-relaxed text-fg-muted">
                Kataloget er tomt, så standardlisten (en løbende linje pr. afdeling + Web engangs) bruges.
                Gem den som katalog for at kunne redigere den.
              </p>
              <button
                type="button"
                className={cn(BRAND_BUTTON, "shrink-0")}
                disabled={Boolean(saving)}
                onClick={() => void seed()}
              >
                {saving === "seed" ? "Gemmer…" : "Gem som katalog"}
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div
                className={cn(
                  "grid gap-3 border-b border-border bg-surface-muted/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft",
                  GRID,
                )}
              >
                <span>Navn</span>
                <span>Nøgle</span>
                <span>Fakturering</span>
                <span>Afdeling</span>
                <span className="text-right">Standardbeløb</span>
                <span className="text-right">Handlinger</span>
              </div>
              <ul className="divide-y divide-border-soft">
                {rows.map((row, i) => (
                  <ServiceRowEditor
                    key={`${row.id || row.key}:${row.name}:${row.billing}:${row.departmentKey}:${row.defaultAmount ?? ""}:${row.active}`}
                    row={row}
                    departments={departments}
                    editable={editable}
                    saving={saving}
                    isFirst={i === 0}
                    isLast={i === rows.length - 1}
                    onSave={(patch) => void update(row.id, patch)}
                    onToggleActive={() => void update(row.id, { active: !row.active }, `active-${row.id}`)}
                    onMove={(dir) => move(i, dir)}
                    onDelete={() => remove(row)}
                  />
                ))}
              </ul>

              {editable ? (
                <div
                  className={cn(
                    "grid items-center gap-3 border-t border-border bg-surface-muted/40 px-4 py-3",
                    GRID,
                  )}
                >
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Ny service, fx Hosting"
                    aria-label="Navn på ny service"
                    className={CELL_INPUT}
                  />
                  <input
                    value={draft.key}
                    onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                    placeholder="auto fra navn"
                    aria-label="Nøgle"
                    className={cn(CELL_INPUT, "font-mono text-[11.5px]")}
                  />
                  <BillingSelect
                    value={draft.billing}
                    onChange={(v) => setDraft((d) => ({ ...d, billing: v }))}
                  />
                  <DepartmentSelect
                    value={draft.departmentKey}
                    departments={departments}
                    onChange={(v) => setDraft((d) => ({ ...d, departmentKey: v }))}
                  />
                  <input
                    value={draft.defaultAmount}
                    onChange={(e) => setDraft((d) => ({ ...d, defaultAmount: e.target.value }))}
                    inputMode="decimal"
                    placeholder="—"
                    aria-label="Standardbeløb"
                    className={cn(CELL_INPUT, "text-right tabular-nums")}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={BRAND_BUTTON}
                      disabled={Boolean(saving) || !draft.name.trim()}
                      onClick={() => void create()}
                    >
                      {saving === "create" ? "Tilføjer…" : "Tilføj service"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * @param {{ value: string; onChange: (v: string) => void; disabled?: boolean }} props
 */
function BillingSelect({ value, onChange, disabled = false }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Fakturering"
      className={CELL_INPUT}
    >
      {SERVICE_BILLING_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * @param {{
 *   value: string;
 *   departments: Array<{ key: string; name: string }>;
 *   onChange: (v: string) => void;
 *   disabled?: boolean;
 * }} props
 */
function DepartmentSelect({ value, departments, onChange, disabled = false }) {
  const known = !value || departments.some((d) => d.key === value);
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Afdeling"
      className={CELL_INPUT}
    >
      <option value="">Ingen afdeling</option>
      {departments.map((d) => (
        <option key={d.key} value={d.key}>
          {d.name}
        </option>
      ))}
      {!known ? <option value={value}>{value}</option> : null}
    </select>
  );
}

/**
 * @param {{
 *   row: ServiceRow;
 *   departments: Array<{ key: string; name: string }>;
 *   editable: boolean;
 *   saving: string | null;
 *   isFirst: boolean;
 *   isLast: boolean;
 *   onSave: (patch: Record<string, unknown>) => void;
 *   onToggleActive: () => void;
 *   onMove: (dir: -1 | 1) => void;
 *   onDelete: () => void;
 * }} props
 */
function ServiceRowEditor({
  row,
  departments,
  editable,
  saving,
  isFirst,
  isLast,
  onSave,
  onToggleActive,
  onMove,
  onDelete,
}) {
  const [name, setName] = useState(row.name);
  const [billing, setBilling] = useState(/** @type {string} */ (row.billing));
  const [departmentKey, setDepartmentKey] = useState(row.departmentKey);
  const [defaultAmount, setDefaultAmount] = useState(amountText(row.defaultAmount));

  const dirty =
    name.trim() !== row.name ||
    billing !== row.billing ||
    departmentKey !== row.departmentKey ||
    (parseAmount(defaultAmount) ?? undefined) !== (row.defaultAmount ?? undefined);
  const busy = Boolean(saving);

  return (
    <li
      className={cn(
        "grid items-center gap-3 px-4 py-2",
        GRID,
        !row.active && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <input
          value={name}
          disabled={!editable}
          onChange={(e) => setName(e.target.value)}
          aria-label="Navn"
          className={CELL_INPUT}
        />
        {!row.active ? (
          <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-fg-muted">
            Inaktiv
          </span>
        ) : null}
      </div>
      <span className="truncate font-mono text-[11px] text-fg-quiet" title="Nøglen gemmes på kontrakterne og kan ikke ændres">
        {row.key}
      </span>
      <BillingSelect value={billing} disabled={!editable} onChange={setBilling} />
      <DepartmentSelect
        value={departmentKey}
        departments={departments}
        disabled={!editable}
        onChange={setDepartmentKey}
      />
      <input
        value={defaultAmount}
        disabled={!editable}
        onChange={(e) => setDefaultAmount(e.target.value)}
        inputMode="decimal"
        placeholder="—"
        aria-label="Standardbeløb"
        className={cn(CELL_INPUT, "text-right tabular-nums")}
      />
      <div className="flex items-center justify-end gap-1">
        {editable ? (
          <>
            {dirty ? (
              <button
                type="button"
                className={BRAND_BUTTON}
                disabled={busy || !name.trim()}
                onClick={() =>
                  onSave({
                    name: name.trim(),
                    billing,
                    departmentKey,
                    defaultAmount: parseAmount(defaultAmount),
                  })
                }
              >
                {saving === row.id ? "Gemmer…" : "Gem"}
              </button>
            ) : null}
            <IconButton label="Flyt op" disabled={busy || isFirst} onClick={() => onMove(-1)}>
              ↑
            </IconButton>
            <IconButton label="Flyt ned" disabled={busy || isLast} onClick={() => onMove(1)}>
              ↓
            </IconButton>
            <button
              type="button"
              disabled={busy}
              onClick={onToggleActive}
              className="h-8 rounded-md border border-border px-2 font-sans text-[11px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
            >
              {row.active ? "Deaktivér" : "Aktivér"}
            </button>
            <IconButton label={`Slet ${row.name}`} disabled={busy} onClick={onDelete} tone="bad">
              ×
            </IconButton>
          </>
        ) : (
          <span className="font-sans text-[11px] text-fg-quiet">Standard</span>
        )}
      </div>
    </li>
  );
}

/**
 * @param {{
 *   label: string;
 *   disabled?: boolean;
 *   onClick: () => void;
 *   tone?: "bad";
 *   children: import('react').ReactNode;
 * }} props
 */
function IconButton({ label, disabled = false, onClick, tone, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border border-border font-sans text-[13px] leading-none transition-colors disabled:opacity-40",
        tone === "bad"
          ? "text-agency-bad hover:border-agency-bad-border hover:bg-agency-bad-soft"
          : "text-fg-muted hover:bg-surface-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
