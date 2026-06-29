import Link from "next/link";

import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

const primaryLinkClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-solid-cta-bg px-6 py-3.5 text-center text-base font-medium text-solid-cta-fg transition hover:bg-solid-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const ghostLinkClass =
  "inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-base font-medium text-fg transition hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className={cn(
        "relative overflow-clip pb-20 pt-32 sm:pb-28 sm:pt-36 md:pt-40",
        shellPaddingX,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--tally-ink-0) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--tally-ink-0) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <div
          className="inline-flex items-center gap-2.5 rounded-full border border-border bg-canvas px-3.5 py-1.5 text-xs uppercase tracking-[0.08em] text-fg-muted"
          role="status"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-accent-green animate-pulse"
            aria-hidden
          />
          <span>
            LIVE · PULSE · <strong className="font-medium text-fg">1337-crm</strong>
          </span>
        </div>

        <div className="flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-6">
            <h1
              id="hero-heading"
              className="text-display-hero max-w-[18ch] text-fg"
            >
              One workspace for{" "}
              <span className="tally-italic-accent">clients</span>, delivery, and
              capacity.
            </h1>
            <p className="max-w-[46ch] text-lg leading-relaxed text-fg-muted md:text-[1.125rem]">
              Pulse overview, clients and contracts, tasks with reusable templates,
              time entries, workload by discipline, team roster, NPS, and reports —
              one design-system UI. Sign in with Google; your data lives in MongoDB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link className={primaryLinkClass} href={routes.login}>
            Continue with Google
            <span aria-hidden>→</span>
          </Link>
          <Link className={ghostLinkClass} href={routes.privacy}>
            Read privacy
          </Link>
        </div>

        <div
          className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.08em] text-fg-soft"
        >
          <span>Google SSO</span>
          <span className="text-fg-quiet">·</span>
          <span>MongoDB-backed</span>
          <span className="text-fg-quiet">·</span>
          <span>Searchmind domain</span>
        </div>
      </div>
    </section>
  );
}
