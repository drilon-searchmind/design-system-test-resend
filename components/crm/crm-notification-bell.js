"use client";

import { useEffect, useRef, useState } from "react";

import { CrmNotificationsView } from "@/components/crm/crm-notifications-view";
import { IconBell } from "@/components/crm/icons";
import { cn } from "@/lib/utils";

export function CrmNotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Notifikationer"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full border border-border",
          "bg-surface-muted text-fg-muted transition hover:border-agency-brand-border hover:text-agency-brand",
        )}
      >
        <IconBell size={16} />
        <CrmNotificationBellBadge />
      </button>

      {open ?
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-canvas shadow-xl">
          <CrmNotificationsView variant="dropdown" onClose={() => setOpen(false)} />
        </div>
      : null}
    </div>
  );
}

function CrmNotificationBellBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      try {
        const { databaseApiQuery } = await import("@/lib/crm/database-api-query");
        const qs = databaseApiQuery();
        const res = await fetch(`/api/notifications?${qs}&limit=1`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (res.ok) setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
      } catch {
        /* ignore */
      }
    }

    queueMicrotask(() => {
      void loadCount();
    });

    function onChanged() {
      void loadCount();
    }
    window.addEventListener("crm-notifications-changed", onChanged);
    return () => window.removeEventListener("crm-notifications-changed", onChanged);
  }, []);

  if (unreadCount <= 0) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-0 top-0 flex -translate-y-[38%] translate-x-[38%] items-center justify-center",
        "rounded-full bg-agency-brand font-sans font-semibold leading-none text-white tabular-nums",
        unreadCount > 9 ? "size-5 text-[9px] tracking-tight" : "size-[18px] text-[10px]",
      )}
    >
      {unreadCount > 9 ? "+9" : unreadCount}
    </span>
  );
}
