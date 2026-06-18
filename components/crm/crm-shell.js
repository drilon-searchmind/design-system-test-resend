"use client";

import { useState, useSyncExternalStore } from "react";

import { usePathname } from "next/navigation";

import { routes } from "@/config/routes";
import { getWorkspaceTitle } from "@/lib/crm/workspace-title";

import { CrmSidebar } from "./crm-sidebar";
import { CrmTimerModal } from "./crm-timer-modal";
import { CrmTopbar } from "./crm-topbar";
import { TimerModalProvider } from "./timer-modal-context";

const STORAGE_KEY = "crm-sidebar-collapsed";
const SIDEBAR_STORE_EVENT = "crm-sidebar-collapsed-change";

function subscribeToSidebarStorage(onChange) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(SIDEBAR_STORE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SIDEBAR_STORE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getSidebarCollapsedServerSnapshot() {
  return false;
}

function persistSidebarCollapsed(next) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SIDEBAR_STORE_EVENT));
  }
}

/**
 * Authenticated Agency OS shell — sidebar + top bar; main scrolls.
 * @param {{ children: import('react').ReactNode }} props
 */
export function CrmShell({ children }) {
  const pathname = usePathname();
  const title = getWorkspaceTitle(pathname);

  const collapsed = useSyncExternalStore(
    subscribeToSidebarStorage,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot,
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Immersive routes render full-bleed: no sidebar, no top bar.
  // Covers the AI Chat one-pager (/chat) and its demo (/chat/demo).
  const immersive = pathname === routes.chat || pathname.startsWith(`${routes.chat}/`);
  if (immersive) {
    return (
      <TimerModalProvider>
        <div className="flex h-[100dvh] shrink-0 overflow-x-hidden overflow-y-auto bg-canvas">{children}</div>
        <CrmTimerModal />
      </TimerModalProvider>
    );
  }

  return (
    <TimerModalProvider>
      <div className="flex min-h-0 flex-1 bg-canvas">
        <CrmSidebar
          className="hidden md:flex"
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapsed={() => persistSidebarCollapsed(!collapsed)}
        />

        {mobileOpen ? (
          <div
            className="fixed inset-0 z-[100] flex md:hidden"
            role="dialog"
            aria-modal
            aria-label="Workspace navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-canvas/80 backdrop-blur-[2px]"
              aria-label="Luk menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative h-full w-[min(280px,88vw)] max-w-full border-r border-border bg-canvas shadow-xl">
              <CrmSidebar
                className="flex h-full w-full"
                pathname={pathname}
                collapsed={false}
                onToggleCollapsed={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CrmTopbar title={title} onOpenNav={() => setMobileOpen(true)} />
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
      <CrmTimerModal />
    </TimerModalProvider>
  );
}
