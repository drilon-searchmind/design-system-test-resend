"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { IconUser, IconUsers } from "@/components/crm/icons";
import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import { cn } from "@/lib/utils";

export const TEAM_MEMBER_UNASSIGNED_KEY = "__unassigned__";

const POPOVER_SUPPORTED =
  typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.showPopover === "function";

/** @param {HTMLElement | null} triggerEl */
function resolveDialogPortalTarget(triggerEl) {
  if (!triggerEl || typeof document === "undefined") return document.body;
  const dialog = triggerEl.closest("dialog");
  if (dialog instanceof HTMLDialogElement && dialog.open) return dialog;
  return document.body;
}

/**
 * @param {{
 *   team: Array<{ id: string; name: string; avatar?: string; hue?: number; image?: string }>;
 *   selected: Set<string>;
 *   onChange: (next: Set<string>) => void;
 *   mineAssigneeKey?: string;
 *   includeUnassigned?: boolean;
 *   emptyLabel?: string;
 *   allSelectedLabel?: string;
 *   countLabel?: (n: number) => string;
 *   showQuickActions?: boolean;
 *   className?: string;
 *   triggerClassName?: string;
 *   menuPlacement?: "portal" | "inline";
 * }} props
 */
export function TeamMemberMultiSelect({
  team,
  selected,
  onChange,
  mineAssigneeKey = "",
  includeUnassigned = false,
  emptyLabel = "Ingen valgt",
  allSelectedLabel = "Alle valgt",
  countLabel = (n) => `${n} valgt`,
  showQuickActions = true,
  className,
  triggerClassName,
  menuPlacement = "portal",
}) {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(/** @type {HTMLElement | null} */ (null));
  const [menuStyle, setMenuStyle] = useState(/** @type {{ top: number; left: number; width: number }} */ ({
    top: 0,
    left: 0,
    width: 280,
  }));
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const portalTargetRef = useRef(/** @type {HTMLElement | null} */ (null));

  const useDialogPortal = menuPlacement === "portal" && !POPOVER_SUPPORTED && portalTarget instanceof HTMLDialogElement;
  const useInlineMenu = menuPlacement === "inline";

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const menuEstimate = 320;

    if (useDialogPortal) {
      const container = portalTargetRef.current;
      if (!(container instanceof HTMLDialogElement)) return;
      const dialogRect = container.getBoundingClientRect();
      let left = rect.right - dialogRect.left - width;
      left = Math.max(12, Math.min(left, dialogRect.width - width - 12));
      let top = rect.bottom - dialogRect.top + 6;
      if (top + menuEstimate > dialogRect.height - 12) {
        top = Math.max(12, rect.top - dialogRect.top - menuEstimate - 6);
      }
      setMenuStyle({ top, left, width });
      return;
    }

    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = rect.bottom + 6;
    if (top + menuEstimate > window.innerHeight - 12) {
      top = Math.max(12, rect.top - menuEstimate - 6);
    }
    setMenuStyle({ top, left, width });
  }, [useDialogPortal]);

  const options = useMemo(() => {
    const sorted = [...team].sort((a, b) => a.name.localeCompare(b.name, "da"));
    if (!includeUnassigned) return sorted;
    return [...sorted, { id: TEAM_MEMBER_UNASSIGNED_KEY, name: "Ikke tildelt" }];
  }, [team, includeUnassigned]);

  const allKeys = useMemo(() => new Set(options.map((o) => o.id)), [options]);

  useEffect(() => {
    if (!open) return;
    if (!useInlineMenu) updateMenuPosition();

    const menu = menuRef.current;
    if (!useInlineMenu && POPOVER_SUPPORTED && menu && !menu.matches(":popover-open")) {
      try {
        menu.showPopover();
      } catch {
        /* already open or unsupported in this frame */
      }
    }

    function onDoc(e) {
      const target = /** @type {Node} */ (e.target);
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onScroll(e) {
      if (useInlineMenu) return;
      const target = e.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    if (!useInlineMenu) {
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", updateMenuPosition);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      if (!useInlineMenu) {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", updateMenuPosition);
        if (POPOVER_SUPPORTED && menuRef.current?.matches(":popover-open")) {
          menuRef.current.hidePopover();
        }
      }
    };
  }, [open, updateMenuPosition, useInlineMenu]);

  useEffect(() => {
    if (open || useInlineMenu) return;
    const menu = menuRef.current;
    if (POPOVER_SUPPORTED && menu?.matches(":popover-open")) {
      menu.hidePopover();
    }
    portalTargetRef.current = null;
    setPortalTarget(null);
  }, [open, useInlineMenu]);

  const triggerLabel = useMemo(() => {
    if (selected.size === 0) return emptyLabel;
    if (selected.size === allKeys.size) return allSelectedLabel;
    if (selected.size === 1) {
      const only = [...selected][0];
      const match = options.find((o) => o.id === only);
      if (match) return match.name;
    }
    return countLabel(selected.size);
  }, [allKeys.size, countLabel, emptyLabel, allSelectedLabel, options, selected]);

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

  function openMenu() {
    setOpen((v) => {
      const next = !v;
      if (next && !useInlineMenu) {
        if (!POPOVER_SUPPORTED) {
          const target = resolveDialogPortalTarget(triggerRef.current);
          portalTargetRef.current = target;
          setPortalTarget(target);
        }
        queueMicrotask(updateMenuPosition);
      }
      return next;
    });
  }

  const menuBody = (
    <>
      {showQuickActions ?
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
      : null}

      <ul
        className="max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain"
        role="listbox"
        aria-multiselectable="true"
      >
        {options.map((member) => {
          const checked = selected.has(member.id);
          const isMine = member.id === mineAssigneeKey;
          const isUnassigned = member.id === TEAM_MEMBER_UNASSIGNED_KEY;
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
    </>
  );

  const portalMenuNode = (
    <div
      ref={menuRef}
      popover={POPOVER_SUPPORTED ? "manual" : undefined}
      style={{
        top: menuStyle.top,
        left: menuStyle.left,
        width: menuStyle.width,
        margin: 0,
      }}
      className={cn(
        "rounded-xl border border-border bg-canvas p-2 shadow-xl",
        useDialogPortal ? "absolute z-[200]" : "fixed z-[200]",
      )}
    >
      {menuBody}
    </div>
  );

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={openMenu}
        className={cn(
          "inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full border px-3 font-sans text-[12px] font-medium transition-colors",
          selected.size > 0 && selected.size < allKeys.size ?
            "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
          : "border-border bg-surface-muted text-fg-muted hover:border-border-strong hover:text-fg",
          triggerClassName,
        )}
      >
        <IconUsers size={13} className="shrink-0 opacity-80" />
        <span className="truncate">{triggerLabel}</span>
        <PulseIconChevronDown size={10} className={cn("shrink-0 opacity-70 transition", open && "rotate-180")} />
      </button>

      {useInlineMenu ?
        open ?
          <div
            ref={menuRef}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(280px,calc(100vw-2rem))] rounded-xl border border-border bg-canvas p-2 shadow-xl"
          >
            {menuBody}
          </div>
        : null
      : typeof document !== "undefined" ?
        POPOVER_SUPPORTED ?
          portalMenuNode
        : open && portalTarget ?
          createPortal(portalMenuNode, portalTarget)
        : null
      : null}
    </div>
  );
}
