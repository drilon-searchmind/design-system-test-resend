"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { routes } from "@/config/routes";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: routes.privacy, label: "Privacy" },
  { href: routes.terms, label: "Terms" },
];

function NavLink({ href, label, variant = "default" }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const tally = variant === "tally";

  return (
    <Link
      href={href}
      className={cn(
        tally
          ? cn(
              "inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm transition",
              active
                ? "bg-surface-active text-fg"
                : "text-fg-muted hover:bg-surface-muted hover:text-fg",
            )
          : cn(
              "nav-tracking inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-1.5 text-xs transition md:text-sm",
              active
                ? "border-border bg-surface-active text-fg"
                : "border-transparent text-fg-muted hover:border-border-hover-soft hover:bg-surface-muted hover:text-fg",
            ),
      )}
    >
      {label}
    </Link>
  );
}

function DrawerNavLink({ href, label, onNavigate, variant = "default" }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const tally = variant === "tally";

  return (
    <Link
      href={href}
      className={cn(
        "-mx-1 flex px-4 py-3.5 text-base font-medium transition",
        tally
          ? cn(
              "rounded-full",
              active
                ? "bg-surface-active text-fg"
                : "text-fg-muted hover:bg-surface-muted hover:text-fg",
            )
          : cn(
              "rounded-xl border nav-tracking",
              active
                ? "border-border bg-surface-active text-fg"
                : "border-transparent text-fg-muted hover:border-border-soft hover:bg-surface-muted hover:text-fg",
            ),
      )}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

function NavDivider() {
  return (
    <span
      className="hidden h-6 w-px shrink-0 self-center bg-border md:block"
      aria-hidden
    />
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg
      className="h-5 w-5 text-fg"
      aria-hidden
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.85"
      stroke="currentColor"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export function SiteNav({ variant = "default" }) {
  const tally = variant === "tally";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef(null);

  const { status } = useSession();

  const isAuthed = status === "authenticated";

  const close = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus?.();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, close]);

  return (
    <div className="relative flex min-w-0 flex-1 items-center justify-end">
      <nav
        className={cn(
          "hidden min-w-0 flex-1 flex-row flex-nowrap items-center justify-end md:flex",
          tally ? "gap-x-1 lg:gap-x-2" : "gap-x-3 lg:gap-x-3",
        )}
        aria-label="Main navigation"
      >
        {!tally ? (
          <div className="flex flex-nowrap items-center gap-1 lg:gap-2">
            {primaryLinks.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} variant={variant} />
            ))}
          </div>
        ) : null}

        {!tally ? <NavDivider /> : null}

        {status === "loading" ? (
          <span
            className="h-9 w-[8.75rem] shrink-0 animate-pulse rounded-full bg-skeleton"
            aria-hidden
          />
        ) : null}

        {!isAuthed && status !== "loading" ? (
          <>
            {!tally ? <NavDivider /> : null}
            {tally ? (
              <Link
                href={routes.login}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-solid-cta-bg px-3.5 py-2 text-sm font-medium text-solid-cta-fg transition hover:bg-solid-cta-hover"
              >
                Log in
              </Link>
            ) : (
              <NavLink href={routes.login} label="Log in" variant={variant} />
            )}
          </>
        ) : null}

        {isAuthed ? (
          <>
            {!tally ? <NavDivider /> : null}
            <div className="flex flex-nowrap items-center gap-1 lg:gap-2">
              <NavLink href={routes.pulse} label="Agency OS" variant={variant} />
              <NavLink href={routes.settings} label="Settings" variant={variant} />
            </div>
            {!tally ? <NavDivider /> : null}
            <button
              type="button"
              className="nav-tracking inline-flex shrink-0 items-center justify-center rounded-full border border-transparent px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg"
              onClick={() => signOut({ callbackUrl: routes.home })}
            >
              Sign out
            </button>
          </>
        ) : null}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2 md:hidden">
        {status === "loading" ? (
          <span
            className="h-10 w-[7.25rem] shrink-0 animate-pulse rounded-full bg-skeleton"
            aria-hidden
          />
        ) : (
          <button
            type="button"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted hover:bg-surface-muted-strong",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <HamburgerIcon open={drawerOpen} />
          </button>
        )}
      </div>

      {drawerOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex min-h-0 flex-col bg-canvas text-fg md:hidden"
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              style={{
                minHeight: "100dvh",
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
              }}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-border py-4",
                  shellPaddingX,
                )}
              >
                <span className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-fg-soft">
                  Menu
                </span>
                <button
                  ref={drawerCloseRef}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-fg-muted hover:bg-surface-active hover:text-fg"
                  aria-label="Close menu"
                  onClick={close}
                >
                  <svg
                    className="h-5 w-5"
                    aria-hidden
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.85"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav
                className={cn(
                  "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain font-sans",
                  shellPaddingX,
                  "py-6",
                )}
                aria-label="Mobile navigation"
              >
                {!tally
                  ? primaryLinks.map(({ href, label }) => (
                      <DrawerNavLink
                        key={href}
                        href={href}
                        label={label}
                        onNavigate={close}
                        variant={variant}
                      />
                    ))
                  : null}

                {!isAuthed && status !== "loading" ? (
                  <DrawerNavLink
                    href={routes.login}
                    label="Log in"
                    onNavigate={close}
                    variant={variant}
                  />
                ) : null}

                {isAuthed ? (
                  <>
                    <DrawerNavLink
                      href={routes.pulse}
                      label="Agency OS"
                      onNavigate={close}
                      variant={variant}
                    />
                    <DrawerNavLink
                      href={routes.settings}
                      label="Settings"
                      onNavigate={close}
                      variant={variant}
                    />
                    <button
                      type="button"
                      className="-mx-1 mt-2 flex w-full rounded-xl border border-border-drawer-soft px-4 py-3.5 text-left text-base font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                      onClick={() => {
                        close();
                        void signOut({ callbackUrl: routes.home });
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : null}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
