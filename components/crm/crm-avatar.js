"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {string | null | undefined} src
 */
export function avatarSrcOrNull(src) {
  const s = typeof src === "string" ? src.trim() : "";
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return null;
}

/**
 * @param {{ label: string; hue?: number; src?: string | null; className?: string; alt?: string }} props
 */
export function CrmAvatar({ label, hue = 220, src, className, alt = "" }) {
  const initials = String(label ?? "?").slice(0, 2).toUpperCase();
  const resolvedSrc = avatarSrcOrNull(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc && !failed);

  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border text-[11px] font-semibold tabular-nums tracking-tight",
        className,
      )}
      style={
        showImage ?
          undefined
        : {
            backgroundColor: `oklch(35% 0.08 ${hue})`,
            color: "var(--color-fg)",
          }
      }
    >
      {showImage ?
        <img
          src={resolvedSrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      : initials}
    </span>
  );
}
