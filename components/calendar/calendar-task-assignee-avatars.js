"use client";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   assignees: Array<{ id: string; avatar?: string; name?: string; image?: string; hue?: number }>;
 *   size?: "xs" | "sm";
 *   className?: string;
 * }} props
 */
export function CalendarTaskAssigneeAvatars({ assignees, size = "sm", className }) {
  if (!assignees.length) return null;

  const sizeClass = size === "xs" ? "size-4 text-[8px]" : "size-5 text-[9px]";

  return (
    <div className={cn("flex shrink-0 -space-x-1", className)} aria-hidden={assignees.length === 1}>
      {assignees.slice(0, 3).map((a) => (
        <CrmAvatar
          key={a.id}
          label={a.avatar ?? a.name?.slice(0, 2) ?? "?"}
          src={a.image}
          hue={a.hue ?? 220}
          alt={a.name ?? ""}
          className={cn(sizeClass, "ring-1 ring-white/90")}
        />
      ))}
    </div>
  );
}
