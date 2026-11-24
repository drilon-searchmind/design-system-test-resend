"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  createEmptyRule,
  opsForField,
} from "@/lib/crm/advanced-filter";
import {
  loadFilterPresets,
  saveFilterPresets,
} from "@/lib/crm/filter-presets";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

const PRESET_MENU_W = 280;

/**
 * ClickUp-inspireret filter-UI: flere regler (AND), presets, gem/ryd.
 * Presets-menu portes til document.body (fixed) så overflow:hidden på tally-panel ikke klipper den.
 *
 * @param {{
 *   scope: string;
 *   fields: import('@/lib/crm/advanced-filter').FilterFieldDef[];
 *   rules: import('@/lib/crm/advanced-filter').FilterRule[];
 *   onRulesChange: (rules: import('@/lib/crm/advanced-filter').FilterRule[]) => void;
 *   builtinPresets?: { id: string; name: string; rules: import('@/lib/crm/advanced-filter').FilterRule[] }[];
 *   className?: string;
 *   panelClassName?: string;
 * }} props
 */
export function AdvancedFilterBar({
  scope,
  fields,
  rules,
  onRulesChange,
  builtinPresets = [],
  className,
  panelClassName,
}) {
  const [open, setOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [presetPos, setPresetPos] = useState(/** @type {{ top: number; left: number } | null} */ (null));
  const [userPresets, setUserPresets] = useState(
    /** @type {import('@/lib/crm/filter-presets').FilterPreset[]} */ ([]),
  );
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const presetsBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const presetsMenuRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    setUserPresets(loadFilterPresets(scope));
  }, [scope]);

  useEffect(() => {
    if (rules.length > 0) setOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- restore open once if rules persisted

  /** @returns {{ top: number; left: number } | null} */
  const computePresetsPos = () => {
    const btn = presetsBtnRef.current;
    if (!btn || typeof window === "undefined") return null;
    const r = btn.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    let left = r.left;
    if (left + PRESET_MENU_W > window.innerWidth - pad) {
      left = Math.max(pad, r.right - PRESET_MENU_W);
    }
    left = Math.max(pad, left);
    let top = r.bottom + gap;
    const estH = 280;
    if (top + estH > window.innerHeight - pad && r.top > estH + pad) {
      top = Math.max(pad, r.top - estH - gap);
    }
    return { top, left };
  };

  useEffect(() => {
    if (!presetsOpen) return undefined;

    const onReposition = () => {
      const next = computePresetsPos();
      if (next) setPresetPos(next);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setPresetsOpen(false);
    };
    const onPointer = (e) => {
      const t = /** @type {Node | null} */ (e.target);
      if (presetsBtnRef.current?.contains(t)) return;
      if (presetsMenuRef.current?.contains(t)) return;
      setPresetsOpen(false);
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [presetsOpen]);

  const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const activeCount = rules.filter((r) => r.field && r.op).length;

  const allPresets = useMemo(
    () => [
      ...builtinPresets.map((p) => ({ ...p, builtin: true, updatedAt: "" })),
      ...userPresets.map((p) => ({ ...p, builtin: false })),
    ],
    [builtinPresets, userPresets],
  );

  const addRule = () => {
    const first = fields[0]?.id ?? "";
    const field = fieldById.get(first);
    const op = opsForField(field ?? { id: first, label: "", type: "text" })[0]?.id ?? "is";
    onRulesChange([...rules, { ...createEmptyRule(first), op }]);
    setOpen(true);
  };

  const updateRule = (id, patch) => {
    onRulesChange(
      rules.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.field && patch.field !== r.field) {
          const field = fieldById.get(patch.field);
          next.op = opsForField(field ?? { id: patch.field, label: "", type: "text" })[0]?.id ?? "is";
          next.value = field?.type === "boolean" ? "true" : "";
          next.valueTo = null;
        }
        return next;
      }),
    );
  };

  const removeRule = (id) => onRulesChange(rules.filter((r) => r.id !== id));
  const clearAll = () => onRulesChange([]);

  const applyPreset = (preset) => {
    onRulesChange(
      (preset.rules ?? []).map((r) => ({
        ...r,
        id: createEmptyRule().id,
      })),
    );
    setPresetsOpen(false);
    setPresetPos(null);
    setOpen(true);
  };

  const savePreset = () => {
    const name = saveName.trim();
    if (!name || !rules.length) return;
    const next = [
      {
        id: `up_${Date.now().toString(36)}`,
        name,
        rules: rules.map((r) => ({ ...r })),
        updatedAt: new Date().toISOString(),
      },
      ...userPresets,
    ].slice(0, 30);
    setUserPresets(next);
    saveFilterPresets(scope, next);
    setSaveName("");
    setSaving(false);
  };

  const deletePreset = (id) => {
    const next = userPresets.filter((p) => p.id !== id);
    setUserPresets(next);
    saveFilterPresets(scope, next);
  };

  const togglePresets = () => {
    setOpen(false);
    if (presetsOpen) {
      setPresetsOpen(false);
      setPresetPos(null);
      return;
    }
    const pos = computePresetsPos();
    if (pos) setPresetPos(pos);
    setPresetsOpen(true);
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="relative flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setPresetsOpen(false);
            setPresetPos(null);
          }}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-sans text-[12px] font-medium transition-colors",
            activeCount > 0
              ? "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
              : "border-border bg-surface-muted text-fg-muted hover:border-agency-brand-border hover:text-fg",
          )}
          aria-expanded={open}
        >
          Filter
          {activeCount > 0 ?
            <span className="tabular-nums text-[10px] text-agency-brand">{activeCount}</span>
          : null}
          <PulseIconChevronDown
            size={10}
            className={cn("opacity-70 transition-transform", open && "rotate-180")}
          />
        </button>

        <button
          ref={presetsBtnRef}
          type="button"
          onClick={togglePresets}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 font-sans text-[12px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:text-fg"
          aria-expanded={presetsOpen}
          aria-haspopup="listbox"
        >
          Presets
          <PulseIconChevronDown
            size={10}
            className={cn("opacity-70 transition-transform", presetsOpen && "rotate-180")}
          />
        </button>

        {presetsOpen && presetPos && typeof document !== "undefined" ?
          createPortal(
            <div
              ref={presetsMenuRef}
              role="listbox"
              className="fixed z-[300] rounded-xl border border-border bg-canvas p-2 shadow-xl"
              style={{ top: presetPos.top, left: presetPos.left, width: PRESET_MENU_W }}
            >
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                Gemte filtre
              </p>
              {allPresets.length === 0 ?
                <p className="px-2 py-3 font-sans text-[12px] text-fg-quiet">Ingen presets endnu.</p>
              : <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                  {allPresets.map((p) => (
                    <li key={p.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left font-sans text-[12px] text-fg hover:bg-surface-muted"
                      >
                        <span className="truncate font-medium">{p.name}</span>
                        {p.builtin ?
                          <span className="ml-1.5 text-[10px] text-fg-quiet">standard</span>
                        : null}
                      </button>
                      {!p.builtin ?
                        <button
                          type="button"
                          onClick={() => deletePreset(p.id)}
                          className="shrink-0 rounded-md px-1.5 py-1 text-[11px] text-agency-bad hover:bg-agency-bad-soft"
                          title="Slet preset"
                        >
                          ×
                        </button>
                      : null}
                    </li>
                  ))}
                </ul>
              }
            </div>,
            document.body,
          )
        : null}

        {activeCount > 0 ?
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-8 items-center rounded-full px-2 font-sans text-[11px] font-medium text-fg-quiet hover:text-fg"
          >
            Ryd
          </button>
        : null}
      </div>

      {open ?
        <div
          className={cn(
            "mt-2 rounded-xl border border-border bg-surface-muted/50 p-3",
            panelClassName,
          )}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
            Hvor alle disse er sande
          </p>

          <ul className="space-y-2">
            {rules.length === 0 ?
              <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center font-sans text-[12px] text-fg-quiet">
                Ingen filtre endnu — tilføj en regel nedenfor (fx Status er ikke Inaktiv).
              </li>
            : rules.map((rule) => {
                const field = fieldById.get(rule.field);
                const ops = opsForField(field ?? { id: rule.field, label: "", type: "text" });
                const needsValue = rule.op !== "is_empty" && rule.op !== "is_not_empty";
                const multi = rule.op === "is_any_of" || rule.op === "is_none_of";
                return (
                  <li key={rule.id} className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                      className={selectCls}
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.op}
                      onChange={(e) =>
                        updateRule(rule.id, { op: /** @type {any} */ (e.target.value) })
                      }
                      className={selectCls}
                    >
                      {ops.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    {needsValue ?
                      field?.type === "enum" || field?.type === "boolean" ?
                        multi ?
                          <select
                            multiple
                            value={
                              Array.isArray(rule.value) ? rule.value.map(String)
                              : rule.value ? [String(rule.value)]
                              : []
                            }
                            onChange={(e) =>
                              updateRule(rule.id, {
                                value: Array.from(e.target.selectedOptions).map((o) => o.value),
                              })
                            }
                            className={cn(selectCls, "min-h-[64px] min-w-[140px]")}
                          >
                            {(field.options ?? []).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        : <select
                            value={rule.value == null ? "" : String(rule.value)}
                            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                            className={selectCls}
                          >
                            <option value="">Vælg…</option>
                            {(field.options ?? []).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                      : field?.type === "number" ?
                        <>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={rule.value ?? ""}
                            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                            className={inputCls}
                            placeholder={field.displayScale === 100 ? "%" : ""}
                          />
                          {rule.op === "between" ?
                            <input
                              type="number"
                              inputMode="decimal"
                              value={rule.valueTo ?? ""}
                              onChange={(e) =>
                                updateRule(rule.id, {
                                  valueTo: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              className={inputCls}
                              placeholder="til"
                            />
                          : null}
                        </>
                      : <input
                          type="text"
                          value={rule.value == null ? "" : String(rule.value)}
                          onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                          className={inputCls}
                          placeholder="Værdi"
                        />
                    : null}

                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-fg-quiet hover:bg-agency-bad-soft hover:text-agency-bad"
                      aria-label="Fjern filter"
                    >
                      ×
                    </button>
                  </li>
                );
              })
            }
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={addRule}
              className="inline-flex h-8 items-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[12px] font-semibold text-agency-brand"
            >
              + Tilføj filter
            </button>

            {rules.length > 0 ?
              saving ?
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Navn på preset…"
                    className={cn(inputCls, "w-[160px]")}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") savePreset();
                      if (e.key === "Escape") setSaving(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={savePreset}
                    disabled={!saveName.trim()}
                    className="inline-flex h-8 items-center rounded-lg border border-agency-brand-border bg-agency-brand px-3 font-sans text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    Gem
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaving(false)}
                    className="font-sans text-[11px] text-fg-quiet hover:text-fg"
                  >
                    Annuller
                  </button>
                </div>
              : <button
                  type="button"
                  onClick={() => setSaving(true)}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-canvas px-3 font-sans text-[12px] font-medium text-fg-muted hover:text-fg"
                >
                  Gem som preset
                </button>
            : null}
          </div>
        </div>
      : null}
    </div>
  );
}

const selectCls =
  "h-8 max-w-[160px] rounded-lg border border-border bg-canvas px-2 font-sans text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";

const inputCls =
  "h-8 w-[100px] rounded-lg border border-border bg-canvas px-2 font-sans text-[12px] tabular-nums text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand";
