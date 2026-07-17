"use client";

import Link from "next/link";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import {
  resolveNotificationActorName,
  resolveNotificationContextTitle,
} from "@/lib/crm/notification-display";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   id: string;
 *   type: string;
 *   title: string;
 *   body: string;
 *   href: string;
 *   readAt: string | null;
 *   createdAt?: string;
 *   contextTitle?: string;
 *   actorDisplayName?: string;
 *   actor?: {
 *     name: string;
 *     avatar?: string;
 *     hue?: number;
 *     image?: string;
 *   } | null;
 * }} NotificationWire
 */

/**
 * @param {{ item: NotificationWire }} props
 */
export function CrmNotificationBody({ item }) {
  const actorName = resolveNotificationActorName(item);
  const contextTitle = resolveNotificationContextTitle(item);

  if (item.type === "task_mention") {
    return (
      <p className="font-sans text-[11px] leading-snug text-fg-muted">
        <span className="font-semibold text-fg">{actorName || "Nogen"}</span> nævnte dig på{" "}
        <span className="font-semibold text-fg">{contextTitle || "opgaven"}</span>.
      </p>
    );
  }

  if (item.type === "task_assigned") {
    return (
      <p className="font-sans text-[11px] leading-snug text-fg-muted">
        <span className="font-semibold text-fg">{actorName || "Nogen"}</span> tildelte dig{" "}
        <span className="font-semibold text-fg">{contextTitle || "en opgave"}</span>.
      </p>
    );
  }

  return item.body ?
      <p className="font-sans text-[11px] leading-snug text-fg-muted">{item.body}</p>
    : null;
}

/**
 * @param {{
 *   item: NotificationWire;
 *   onNavigate?: () => void;
 *   onMarkRead?: (id: string) => void;
 *   compact?: boolean;
 * }} props
 */
export function CrmNotificationRow({ item, onNavigate, onMarkRead, compact = false }) {
  const actorName = resolveNotificationActorName(item);
  const actor = item.actor;
  const avatarLabel = actor?.avatar ?? (actorName.slice(0, 2).toUpperCase() || "?");

  return (
    <Link
      href={item.href || "#"}
      onClick={() => {
        if (!item.readAt) onMarkRead?.(item.id);
        onNavigate?.();
      }}
      className={cn(
        "flex gap-2.5 border-b border-border-soft transition hover:bg-surface-muted",
        compact ? "px-3 py-3" : "px-4 py-3.5 md:px-5",
        !item.readAt && "bg-agency-brand-soft/30",
      )}
    >
      <CrmAvatar
        label={avatarLabel}
        src={actor?.image}
        hue={actor?.hue ?? 220}
        className={cn("shrink-0", compact ? "size-7 text-[9px]" : "size-8 text-[10px]")}
        alt={actorName || "Bruger"}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("font-sans font-semibold text-fg", compact ? "text-[12px]" : "text-[13px]")}>
          {item.title}
        </p>
        <div className={compact ? "mt-0.5" : "mt-1"}>
          <CrmNotificationBody item={item} />
        </div>
      </div>
    </Link>
  );
}
