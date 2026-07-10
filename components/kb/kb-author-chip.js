import { CrmAvatar } from "@/components/crm/crm-avatar";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   author?: import("@/lib/crm/knowledge-utils").KnowledgeAuthorView | null;
 *   authorId?: string;
 *   size?: "sm" | "md";
 *   showName?: boolean;
 *   nameClassName?: string;
 *   className?: string;
 * }} props
 */
export function KbAuthorChip({
  author,
  authorId = "",
  size = "sm",
  showName = true,
  nameClassName,
  className,
}) {
  const avatarSize = size === "md" ? "size-[26px] text-[9px]" : "size-[22px] text-[8px]";
  const label = author?.name ?? authorId ?? "Ukendt";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <CrmAvatar
        label={author?.avatar ?? label.slice(0, 2)}
        src={author?.image}
        hue={author?.hue ?? 220}
        alt={label}
        className={cn("shrink-0", avatarSize)}
      />
      {showName ?
        <span className={cn("truncate font-sans text-[11px] text-fg-muted", nameClassName)}>
          <span className="font-medium text-fg">{label}</span>
        </span>
      : null}
    </span>
  );
}
