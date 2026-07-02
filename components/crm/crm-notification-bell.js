"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconBell } from "@/components/crm/icons";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   id: string;
 *   type: string;
 *   title: string;
 *   body: string;
 *   href: string;
 *   readAt: string | null;
 *   createdAt: string;
 * }} NotificationItem
 */

export function CrmNotificationBell() {
  const { status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(/** @type {NotificationItem[]} */ ([]));
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setLoading(true);
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/notifications?${qs}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    queueMicrotask(() => {
      void refresh();
    });
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh, sessionStatus]);

  useEffect(() => {
    function onChanged() {
      void refresh();
    }
    window.addEventListener("crm-notifications-changed", onChanged);
    return () => window.removeEventListener("crm-notifications-changed", onChanged);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id) {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      const qs = databaseApiQuery();
      const res = await fetch(`/api/notifications?${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnreadCount(0);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Notifikationer"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full border border-border",
          "bg-surface-muted text-fg-muted transition hover:border-agency-brand-border hover:text-agency-brand",
        )}
      >
        <IconBell size={16} />
        {unreadCount > 0 ?
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
        : null}
      </button>

      {open ?
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-canvas shadow-xl">
          <div className="flex items-center justify-between border-b border-border-soft px-3 py-2.5">
            <p className="font-sans text-[13px] font-semibold text-fg">Notifikationer</p>
            {unreadCount > 0 ?
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="font-sans text-[11px] font-medium text-agency-brand hover:underline"
              >
                Markér alle læst
              </button>
            : null}
          </div>
          <ul className="max-h-[min(420px,60vh)] overflow-y-auto">
            {loading && items.length === 0 ?
              <li className="px-3 py-6 text-center text-[12px] text-fg-muted">Indlæser…</li>
            : items.length === 0 ?
              <li className="px-3 py-6 text-center text-[12px] text-fg-muted">Ingen notifikationer endnu.</li>
            : items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href || "#"}
                    onClick={() => {
                      if (!n.readAt) void markRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "block border-b border-border-soft px-3 py-3 transition hover:bg-surface-muted",
                      !n.readAt && "bg-agency-brand-soft/30",
                    )}
                  >
                    <p className="font-sans text-[12px] font-semibold text-fg">{n.title}</p>
                    {n.body ?
                      <p className="mt-0.5 font-sans text-[11px] leading-snug text-fg-muted">{n.body}</p>
                    : null}
                  </Link>
                </li>
              ))
            }
          </ul>
        </div>
      : null}
    </div>
  );
}
