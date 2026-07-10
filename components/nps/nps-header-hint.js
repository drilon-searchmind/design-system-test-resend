"use client";

import { CrmHoverPopover } from "@/components/crm/crm-hover-popover";
import { cn } from "@/lib/utils";

const npsHeaderHintClass =
  "font-[inherit] text-[inherit] underline decoration-dotted decoration-border/80 underline-offset-2 hover:text-fg";

/**
 * @param {{
 *   label: import('react').ReactNode;
 *   title: string;
 *   content?: import('react').ReactNode;
 *   children?: import('react').ReactNode;
 *   align?: "start" | "center";
 *   className?: string;
 * }} props
 */
export function NpsHeaderHint({ label, title, content, children, align = "start", className }) {
  return (
    <CrmHoverPopover
      align={align}
      title={title}
      content={
        content ?? (
          <p className="font-sans text-[12px] leading-snug text-fg-muted">{children}</p>
        )
      }
      triggerClassName={cn(npsHeaderHintClass, className)}
    >
      {label}
    </CrmHoverPopover>
  );
}
