"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { CrmTimerChip } from "@/components/crm/crm-timer-chip";
import { routes } from "@/config/routes";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

import { IconMenu } from "./icons";

/**
 * @param {{ title: string; onOpenNav: () => void; className?: string }} props
 */
export function CrmTopbar({ title, onOpenNav, className }) {
  const { data: session, status } = useSession();
  const email = typeof session?.user?.email === "string" ? session.user.email : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b border-border bg-surface-glass backdrop-blur-xl",
        className,
      )}
    >
      <div className={cn(shellPaddingX, "flex min-h-[52px] w-full items-center justify-between gap-4")}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border md:hidden",
              "text-fg hover:bg-surface-muted",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-label="Åbn menu"
            onClick={onOpenNav}
          >
            <IconMenu size={18} />
          </button>
          <h1 className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-fg md:text-lg">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <CrmTimerChip />
          {status === "loading" ? (
            <span className="h-8 w-24 animate-pulse rounded-full bg-skeleton" aria-hidden />
          ) : null}
          {email ? (
            <span className="hidden max-w-[14rem] truncate text-[11px] text-fg-soft md:inline">
              {email}
            </span>
          ) : null}
          <Link
            href={routes.settings}
            className="hidden rounded-full px-3 py-1.5 text-xs text-fg-muted transition hover:bg-surface-muted hover:text-fg sm:inline-block"
          >
            Indstillinger
          </Link>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-xs text-fg-muted transition hover:bg-surface-muted hover:text-fg"
            onClick={() =>
              void signOut({ callbackUrl: routes.home, redirect: true })
            }
          >
            Log ud
          </button>
        </div>
      </div>
    </header>
  );
}
