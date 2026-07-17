"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { CrmNotificationRow } from "@/components/crm/crm-notification-row";
import { PulseIconSearch } from "@/components/pulse/pulse-icons";
import { routes } from "@/config/routes";
import { notificationMatchesQuery } from "@/lib/crm/notification-display";
import { databaseApiQuery } from "@/lib/crm/database-api-query";
import { cn } from "@/lib/utils";

/**
 * @typedef {import("@/components/crm/crm-notification-row").NotificationWire} NotificationWire
 */

/**
 * @param {{ limit?: number }} [opts]
 */
async function fetchNotifications(limit) {
  const qs = databaseApiQuery();
  const params = new URLSearchParams(qs);
  if (typeof limit === "number" && limit > 0) params.set("limit", String(limit));
  const res = await fetch(`/api/notifications?${params.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Kunne ikke hente notifikationer");
  return {
    items: /** @type {NotificationWire[]} */ (Array.isArray(data.items) ? data.items : []),
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

/**
 * @param {{
 *   variant?: "dropdown" | "page";
 *   onClose?: () => void;
 * }} props
 */
export function CrmNotificationsView({ variant = "page", onClose }) {
  const { status: sessionStatus } = useSession();
  const [items, setItems] = useState(/** @type {NotificationWire[]} */ ([]));
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const isDropdown = variant === "dropdown";
  const limit = isDropdown ? 30 : 200;

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setLoading(true);
    try {
      const data = await fetchNotifications(limit);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [limit, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh, sessionStatus]);

  useEffect(() => {
    function onChanged() {
      void refresh();
    }
    window.addEventListener("crm-notifications-changed", onChanged);
    return () => window.removeEventListener("crm-notifications-changed", onChanged);
  }, [refresh]);

  async function markRead(id) {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      window.dispatchEvent(new Event("crm-notifications-changed"));
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
        window.dispatchEvent(new Event("crm-notifications-changed"));
      }
    } catch {
      /* ignore */
    }
  }

  const filteredItems = useMemo(
    () => (isDropdown ? items : items.filter((item) => notificationMatchesQuery(item, query))),
    [isDropdown, items, query],
  );

  return (
    <div className={cn(isDropdown ? "" : "tally-panel overflow-hidden")}>
      <div
        className={cn(
          "flex items-center justify-between border-b border-border-soft",
          isDropdown ? "px-3 py-2.5" : "px-4 py-3 md:px-5",
        )}
      >
        {isDropdown ?
          <p className="font-sans text-[13px] font-semibold text-fg">Notifikationer</p>
        : unreadCount > 0 ?
          <p className="font-sans text-[12px] text-fg-muted">{unreadCount} ulæste</p>
        : <span />}
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

      {!isDropdown ?
        <div className="border-b border-border-soft px-4 py-3 md:px-5">
          <label className="relative block">
            <span className="sr-only">Søg i notifikationer</span>
            <PulseIconSearch
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-quiet"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg efter person, opgave eller tekst…"
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-canvas pl-9 pr-3",
                "font-sans text-[13px] text-fg placeholder:text-fg-quiet",
                "outline-none focus:border-agency-brand-border focus:ring-2 focus:ring-agency-brand/20",
              )}
            />
          </label>
        </div>
      : null}

      <ul className={cn(isDropdown ? "max-h-[min(420px,60vh)] overflow-y-auto" : "max-h-none")}>
        {loading && items.length === 0 ?
          <li className={cn("text-center text-[12px] text-fg-muted", isDropdown ? "px-3 py-6" : "px-4 py-10")}>
            Indlæser…
          </li>
        : filteredItems.length === 0 ?
          <li className={cn("text-center text-[12px] text-fg-muted", isDropdown ? "px-3 py-6" : "px-4 py-10")}>
            {query.trim() ? "Ingen notifikationer matcher din søgning." : "Ingen notifikationer endnu."}
          </li>
        : filteredItems.map((item) => (
            <li key={item.id}>
              <CrmNotificationRow
                item={item}
                compact={isDropdown}
                onMarkRead={markRead}
                onNavigate={onClose}
              />
            </li>
          ))
        }
      </ul>

      {isDropdown ?
        <div className="border-t border-border-soft px-3 py-2.5">
          <Link
            href={routes.notifications}
            onClick={() => onClose?.()}
            className="flex h-8 w-full items-center justify-center rounded-md border border-border bg-surface-muted font-sans text-[12px] font-medium text-fg-muted transition hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand"
          >
            Se alle
          </Link>
        </div>
      : null}
    </div>
  );
}
