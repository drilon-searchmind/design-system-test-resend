"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { CrmAvatar } from "@/components/crm/crm-avatar";
import { CrmNotificationBell } from "@/components/crm/crm-notification-bell";
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
  const name = typeof session?.user?.name === "string" ? session.user.name : email ?? "Bruger";
  const image = typeof session?.user?.image === "string" ? session.user.image : null;
  const avatarLabel = name.slice(0, 2);

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
          {email ? <CrmNotificationBell /> : null}
          {status === "loading" ? (
            <span className="h-8 w-8 animate-pulse rounded-md bg-skeleton" aria-hidden />
          ) : email ? (
            <div className="hidden items-center gap-2 md:flex">
              <CrmAvatar label={avatarLabel} src={image} className="size-8 text-[11px]" />
              <div className="min-w-0 max-w-[14rem]">
                <p className="truncate text-[12px] font-medium text-fg">{name}</p>
                <p className="truncate text-[10px] text-fg-soft">{email}</p>
              </div>
            </div>
          ) : null}
          {email ? (
            <CrmAvatar label={avatarLabel} src={image} className="size-8 text-[11px] md:hidden" />
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
