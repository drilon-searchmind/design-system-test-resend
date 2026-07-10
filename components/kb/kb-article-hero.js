import { cn } from "@/lib/utils";

/**
 * @param {{ imageUrl: string; alt?: string; className?: string; embedded?: boolean }} props
 */
export function KbArticleHero({ imageUrl, alt = "", className, embedded = false }) {
  if (!imageUrl?.trim()) return null;

  return (
    <div
      className={cn(
        embedded ?
          "border-b border-border-soft bg-surface-muted"
        : "overflow-hidden rounded-xl border border-border-soft bg-surface-muted",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className="aspect-[16/9] w-full object-cover" />
    </div>
  );
}
