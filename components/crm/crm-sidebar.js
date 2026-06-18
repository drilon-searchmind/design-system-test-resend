"use client";

import Link from "next/link";

import { routes } from "@/config/routes";
import { CRM_NAV_GROUPS, CRM_NAV_ITEMS } from "@/lib/crm/nav-config";
import { CLIENTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

import { CrmNavIcon, IconMenu, IconMenuL, IconSettings } from "./icons";
import { useTimerModal } from "./timer-modal-context";

function isNavActive(pathname, href, itemId, timerModalOpen) {
  if (itemId === "timer") return Boolean(timerModalOpen);
  if (itemId === "time") return pathname === routes.time || pathname.startsWith(`${routes.time}/`);
  if (!href) return false;
  if (pathname === href) return true;
  if (href !== routes.pulse && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function CrmSidebar({ pathname, collapsed, onToggleCollapsed, className, onNavigate }) {
  const { open: timerModalOpen, openTimer } = useTimerModal();
  const w = collapsed ? 56 : 220;

  return (
    <aside
      className={cn("flex shrink-0 flex-col bg-sidebar-bg", className)}
      style={{ width: w, transition: "width 0.18s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
    >
      {/* Logo / workspace header */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-0" : "justify-between gap-2 px-3",
        )}
      >
        <Link
          href={routes.pulse}
          className={cn("flex min-w-0 items-center gap-2.5", collapsed ? "justify-center" : "flex-1")}
          onClick={onNavigate}
        >
          {/* Lime logo mark */}
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-solid-cta-bg text-[12px] font-bold text-solid-cta-fg">
            S
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate font-sans text-[13px] font-semibold leading-tight text-sidebar-fg">
                Searchmind
              </span>
              <span className="block truncate font-sans text-[10.5px] leading-tight text-sidebar-fg-muted">
                Agency OS
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-sidebar-fg-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid-cta-bg"
            onClick={onToggleCollapsed}
            aria-label="Skjul sidebar"
          >
            <IconMenuL size={14} />
          </button>
        ) : null}
      </div>

      {/* Expand button when collapsed */}
      {collapsed ? (
        <button
          type="button"
          className="mx-auto mt-2 flex h-[30px] w-[30px] items-center justify-center rounded-md text-sidebar-fg-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg"
          onClick={onToggleCollapsed}
          aria-label="Vis sidebar"
        >
          <IconMenu size={14} />
        </button>
      ) : null}

      {/* Nav groups */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Workspace">
        {CRM_NAV_GROUPS.map((group) => (
          <div key={group.id} className="py-1">
            {!collapsed ? (
              <div className="px-2.5 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-section">
                {group.label}
              </div>
            ) : null}
            {CRM_NAV_ITEMS.filter((i) => i.group === group.id).map((item) => {
              const href = item.href ?? "";
              const active = isNavActive(pathname, href, item.id, timerModalOpen);
              const itemClass = cn(
                "mb-0.5 flex h-[30px] items-center gap-2.5 rounded-md font-sans text-[13px] transition-colors",
                collapsed ? "justify-center px-0" : "px-2.5",
                active
                  ? "bg-sidebar-active-bg font-medium text-sidebar-active-fg"
                  : "font-normal text-sidebar-fg-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg",
              );
              const iconWrap = (
                <span className={cn("inline-flex shrink-0", active ? "text-sidebar-active-fg" : "text-sidebar-fg-quiet")}>
                  <CrmNavIcon navId={item.id} size={15} />
                </span>
              );
              if (item.openTimerModal) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    aria-haspopup="dialog"
                    aria-expanded={timerModalOpen}
                    className={itemClass}
                    onClick={() => { openTimer(); onNavigate?.(); }}
                  >
                    {iconWrap}
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </button>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={/** @type {string} */ (item.href)}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={itemClass}
                >
                  {iconWrap}
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings footer */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border pb-3 pt-2",
          collapsed ? "flex flex-col items-center px-1" : "px-2.5",
        )}
      >
        <Link
          href={routes.settings}
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center gap-2 rounded-md py-1.5 text-[12px] text-sidebar-fg-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg",
            collapsed ? "justify-center" : "px-1",
          )}
        >
          <IconSettings className="text-sidebar-fg-quiet" size={16} />
          {!collapsed ? <span>Indstillinger</span> : null}
        </Link>
      </div>
    </aside>
  );
}
