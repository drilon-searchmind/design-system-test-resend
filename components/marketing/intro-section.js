import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

/** Intro band — Tally section-head rhythm */

export function IntroSection() {
  return (
    <section
      aria-labelledby="intro-heading"
      className={cn("border-y border-border-muted py-20 md:py-28", shellPaddingX)}
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs uppercase tracking-[0.08em] text-fg-soft">
            ◇ introduction
          </p>
          <h2
            id="intro-heading"
            className="max-w-[18ch] text-[clamp(2rem,4vw,3.5rem)] leading-[1.06] tracking-[-0.03em] text-fg"
          >
            Quiet confidence,{" "}
            <span className="tally-italic-accent">loud</span> craft.
          </h2>
        </div>
        <div className="flex flex-col gap-6 leading-relaxed">
          <p className="text-lg leading-[1.55] text-fg-muted">
            Inspired by the Tally register on a cool paper canvas: space is
            intentional, hierarchy is unmistakable, and indigo accents stay
            precise — never noisy.
          </p>
          <p className="leading-relaxed text-fg-muted md:max-w-prose">
            Searchmind teammates sign in with Google accounts on the{" "}
            <span className="font-medium text-fg">@searchmind.dk</span> domain
            today. The same user record can later represent external collaborators
            with a reduced access tier — swap providers or add invites without
            changing the model.
          </p>
        </div>
      </div>
    </section>
  );
}
