"use client";

import Link from "next/link";

import { CrmTimerChip } from "@/components/crm/crm-timer-chip";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { routes } from "@/config/routes";
import { shellHeaderInner } from "@/config/shell";
import { cn } from "@/lib/utils";

import { IconMenu } from "./icons";

/**
 * @param {{ title: string; onOpenNav: () => void; className?: string }} props
 */
export function CrmTopbar({ title, onOpenNav, className }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b border-border bg-surface-header/95 backdrop-blur-md",
        className,
      )}
    >
      <div className={shellHeaderInner}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border md:hidden",
              "text-fg hover:bg-surface-muted",
            )}
            aria-label="Åbn menu"
            onClick={onOpenNav}
          >
            <IconMenu size={18} />
          </button>
          <h1 className="truncate font-sans text-base font-semibold leading-tight tracking-tight text-fg md:text-lg">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <CrmTimerChip />
          <ThemeToggle />
          <Link
            href={routes.settings}
            className="hidden rounded-full border border-border px-3 py-1.5 font-sans text-xs text-fg-muted hover:bg-surface-muted hover:text-fg sm:inline-block"
          >
            Indstillinger
          </Link>
        </div>
      </div>
    </header>
  );
}
