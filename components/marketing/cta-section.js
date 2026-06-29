import Link from "next/link";

import { routes } from "@/config/routes";
import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className={cn("pb-24 pt-4 sm:pb-28 md:pb-32", shellPaddingX)}
    >
      <div
        className={cn(
          "relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-border bg-cta-panel px-8 py-14 sm:px-12 md:py-16",
        )}
      >
        <div className="flex max-w-xl flex-col gap-6">
          <h2 id="cta-heading" className="text-fg">
            Start from a canvas that already feels{" "}
            <span className="tally-italic-accent">finished</span>.
          </h2>
          <p className="leading-relaxed text-fg-muted">
            Authenticate with your Searchmind Google account, land in the dashboard,
            and iterate with the same light, precise UI system everywhere.
          </p>
          <Link
            className="mt-2 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-solid-cta-bg px-6 py-3.5 text-base font-medium text-solid-cta-fg transition hover:bg-solid-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href={routes.login}
          >
            Go to sign in
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
