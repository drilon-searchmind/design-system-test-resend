"use client";

import { cn } from "@/lib/utils";

/**
 * Focused centered card chrome for sign-in flows (Tally / marketing-tally surface).
 */
export function AuthCard({ title, subtitle, children, className }) {
  return (
    <div className="mx-auto flex w-full flex-col gap-8">
      <header>
        <p className="text-xs uppercase tracking-[0.08em] text-fg-soft">
          ◇ sign in
        </p>
        <h1
          className="mt-3 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-fg"
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-base leading-relaxed text-fg-muted">{subtitle}</p>
        ) : null}
      </header>
      <section
        className={cn(
          "rounded-[20px] border border-border bg-canvas p-8",
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
}
