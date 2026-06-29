import { cn } from "@/lib/utils";

/**
 * @param {{ label: string; hue?: number; className?: string }} props
 */
export function CrmAvatar({ label, hue = 220, className }) {
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-[11px] font-semibold tabular-nums tracking-tight",
        className,
      )}
      style={{
        backgroundColor: `oklch(35% 0.08 ${hue})`,
        color: "var(--color-fg)",
      }}
    >
      {initials}
    </span>
  );
}
