"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { IconUser, IconUsers } from "@/components/crm/icons";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

export const TASKS_UNASSIGNED_ASSIGNEE_KEY = "__unassigned__";

/**
 * @param {{
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   mineAssigneeKey: string;
 *   selected: Set<string>;
 *   onChange: (next: Set<string>) => void;
 *   hasUnassignedTasks?: boolean;
 * }} props
 */
export function TasksAssigneeFilter({
  team,
  mineAssigneeKey,
  selected,
  onChange,
  hasUnassignedTasks = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(/** @type {{ top: number; left: number; width: number }} */ ({
    top: 0,
    left: 0,
    width: 280,
  }));
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    setMenuStyle({
      top: rect.bottom + 6,
      left,
      width,
    });
  }, []);

  const options = useMemo(() => {
    const sorted = [...team].sort((a, b) => a.name.localeCompare(b.name, "da"));
    if (!hasUnassignedTasks) return sorted;
    return [...sorted, { id: TASKS_UNASSIGNED_ASSIGNEE_KEY, name: "Ikke tildelt" }];
  }, [team, hasUnassignedTasks]);

  const allKeys = useMemo(() => new Set(options.map((o) => o.id)), [options]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    function onDoc(e) {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onDismiss() {
      setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  const triggerLabel = useMemo(() => {
    if (selected.size === 0) return "Ingen ansvarlige";
    if (selected.size === allKeys.size) return "Alle ansvarlige";
    if (selected.size === 1) {
      const only = [...selected][0];
      const match = options.find((o) => o.id === only);
      if (match) return match.name;
    }
    return `${selected.size} ansvarlige`;
  }, [allKeys.size, options, selected]);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(allKeys));
  }

  function selectMineOnly() {
    if (mineAssigneeKey) onChange(new Set([mineAssigneeKey]));
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) queueMicrotask(updateMenuPosition);
            return next;
          });
        }}
        className={cn(
          "inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full border px-3 font-sans text-[12px] font-medium transition-colors",
          selected.size > 0 && selected.size < allKeys.size ?
            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
          : "border-border bg-surface-muted text-fg-muted hover:border-border-strong hover:text-fg",
        )}
      >
        <IconUsers size={13} className="shrink-0 opacity-80" />
        <span className="truncate">{triggerLabel}</span>
        <PulseIconChevronDown size={10} className={cn("shrink-0 opacity-70 transition", open && "rotate-180")} />
      </button>

      {open && typeof document !== "undefined" ?
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            className={cn(
              "fixed z-[200] rounded-xl border border-border bg-canvas p-2 shadow-xl",
            )}
          >
            <div className="mb-2 flex flex-wrap gap-1 border-b border-border-soft px-1 pb-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md px-2 py-1 font-sans text-[11px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                Vælg alle
              </button>
              {mineAssigneeKey ?
                <button
                  type="button"
                  onClick={selectMineOnly}
                  className="rounded-md px-2 py-1 font-sans text-[11px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                >
                  Kun mig
                </button>
              : null}
            </div>

            <ul className="max-h-[min(50vh,320px)] overflow-y-auto" role="listbox" aria-multiselectable="true">
              {options.map((member) => {
                const checked = selected.has(member.id);
                const isMine = member.id === mineAssigneeKey;
                const isUnassigned = member.id === TASKS_UNASSIGNED_ASSIGNEE_KEY;
                return (
                  <li key={member.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted",
                        checked && "bg-surface-muted/80",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(member.id)}
                        className="size-3.5 shrink-0 rounded border-border accent-agency-brand"
                      />
                      {isUnassigned ?
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted text-fg-quiet">
                          <IconUser size={12} />
                        </span>
                      : (
                        <CrmAvatar
                          label={member.avatar ?? member.name.slice(0, 2)}
                          src={member.image}
                          hue={member.hue ?? 220}
                          className="size-6 text-[9px]"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-fg">{member.name}</span>
                      {isMine ?
                        <span className="shrink-0 rounded-full bg-agency-brand-soft px-1.5 py-0.5 text-[9px] font-semibold text-agency-brand">
                          Dig
                        </span>
                      : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null}
    </div>
  );
}

/** @param {string} mineAssigneeKey @param {Array<{ id: string }>} team */
export function defaultTasksAssigneeSelection(mineAssigneeKey, team) {
  if (mineAssigneeKey) return new Set([mineAssigneeKey]);
  return new Set(team.map((t) => t.id));
}

/**
 * @param {string} assigneeId
 * @param {Set<string>} selected
 */
export function taskMatchesAssigneeFilter(assigneeId, selected) {
  if (selected.size === 0) return false;
  const key = assigneeId?.trim() ? assigneeId.trim() : TASKS_UNASSIGNED_ASSIGNEE_KEY;
  return selected.has(key);
}
