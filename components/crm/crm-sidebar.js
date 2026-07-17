"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { routes } from "@/config/routes";
import { CRM_NAV_GROUPS, CRM_NAV_ITEMS } from "@/lib/crm/nav-config";
import { cn } from "@/lib/utils";

import { CrmNavIcon, IconMenu, IconMenuL, IconSettings } from "./icons";

function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="6" height="18" rx="1.5" fill="currentColor" />
      <rect
        x="11"
        y="9"
        width="6"
        height="12"
        rx="1.5"
        fill="currentColor"
        opacity="0.55"
      />
      <rect x="19" y="14" width="3" height="7" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function isNavActive(pathname, href, itemId) {
  if (itemId === "time") {
    return pathname === routes.time || pathname.startsWith(`${routes.time}/`);
  }
  if (!href) return false;
  if (pathname === href) return true;
  if (href !== routes.pulse && pathname.startsWith(`${href}/`)) return true;
  return false;
}

/**
 * @param {object} props
 * @param {string} props.pathname
 * @param {boolean} props.collapsed
 * @param {() => void} props.onToggleCollapsed
 * @param {string} [props.className]
 * @param {() => void} [props.onNavigate]
 */
export function CrmSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
  className,
  onNavigate,
}) {
  const w = collapsed ? 56 : 220;
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const navItems = CRM_NAV_ITEMS.filter((item) => item.id !== "users" || isAdmin);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-canvas/65 backdrop-blur-sm",
        className,
      )}
      style={{ width: w, transition: "width 0.18s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
    >
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-0" : "justify-between gap-2 px-3",
        )}
      >
        <Link
          href={routes.pulse}
          className={cn(
            "flex min-w-0 items-center gap-2 text-fg",
            collapsed ? "justify-center" : "flex-1",
          )}
          onClick={onNavigate}
        >
          <span className="flex shrink-0 items-center justify-center">
            <BrandMark size={collapsed ? 20 : 22} />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight tracking-tight">
                Searchmind
              </span>
              <span className="block truncate text-[10px] uppercase tracking-[0.06em] text-fg-soft">
                Agency OS
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              "text-fg-muted hover:bg-surface-muted hover:text-fg",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            onClick={onToggleCollapsed}
            aria-label="Skjul sidebar"
          >
            <IconMenuL size={14} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
          onClick={onToggleCollapsed}
          aria-label="Vis sidebar"
        >
          <IconMenu size={14} />
        </button>
      ) : null}

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Workspace">
        {CRM_NAV_GROUPS.map((group) => (
          <div key={group.id} className="py-1">
            {!collapsed ? (
              <div className="px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-[0.08em] text-fg-soft">
                {group.label}
              </div>
            ) : null}
            {navItems.filter((i) => i.group === group.id).map((item) => {
              const href = item.href ?? "";
              const active = isNavActive(pathname, href, item.id);
              const itemClass = cn(
                "mb-0.5 flex h-8 items-center gap-2.5 rounded-xl text-[13px] transition-colors",
                collapsed ? "justify-center px-0" : "px-2.5",
                active
                  ? "bg-surface-active font-medium text-fg"
                  : "font-normal text-fg-muted hover:bg-surface-muted hover:text-fg",
              );
              const iconWrap = (
                <span
                  className={cn(
                    "inline-flex shrink-0",
                    active ? "text-accent" : "text-fg-quiet",
                  )}
                >
                  <CrmNavIcon navId={item.id} size={15} />
                </span>
              );
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

      <div
        className={cn(
          "shrink-0 border-t border-border pb-3 pt-2",
          collapsed ? "flex flex-col items-center px-1" : "px-2.5",
        )}
      >
        <Link
          href={routes.settings}
          onClick={onNavigate}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl py-1.5 text-[12px] text-fg-muted hover:bg-surface-muted hover:text-fg",
            collapsed ? "justify-center" : "px-1",
          )}
        >
          <IconSettings className="text-fg-quiet" size={16} />
          {!collapsed ? <span>Indstillinger</span> : null}
        </Link>
      </div>
    </aside>
  );
}
