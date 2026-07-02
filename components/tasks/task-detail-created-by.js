"use client";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { formatIsoDateDa } from "@/lib/crm/format-da";

/**
 * @param {{
 *   creator?: { name: string; avatar?: string; hue?: number; image?: string } | null;
 *   createdAt?: string;
 * }} props
 */
export function TaskDetailCreatedBy({ creator, createdAt = "" }) {
  const label = creator?.name ?? "Ukendt";
  const dateLabel = createdAt ? formatIsoDateDa(createdAt) : "—";

  return (
    <p className="flex flex-wrap items-center gap-2 font-sans text-[12px] text-fg-muted">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">Oprettet af</span>
      {creator ?
        <CrmAvatar
          label={creator.avatar ?? creator.name.slice(0, 2)}
          src={creator.image}
          hue={creator.hue ?? 220}
          className="size-6 text-[9px]"
          alt={creator.name}
        />
      : null}
      <span className="font-medium text-fg">{label}</span>
      <span className="text-fg-quiet">·</span>
      <span className="tabular-nums text-fg-soft">{dateLabel}</span>
    </p>
  );
}
