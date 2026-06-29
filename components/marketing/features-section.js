import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

/** Three-column feature grid — Tally soft cards */

const FEATURES = [
  {
    title: "Google workspace SSO",
    description:
      "Internal users authenticate with 1337-crm’s Google integration. Sessions are JWT-based; user profiles sync to MongoDB on every sign-in.",
  },
  {
    title: "Performance-minded defaults",
    description:
      "Server components by default, pragmatic utilities, and hooks when you need isolation on the client.",
  },
  {
    title: "Ready for real billing",
    description:
      "API routes for health, webhooks, and cron are stubbed where your provider keys will land.",
  },
];

export function FeaturesSection() {
  return (
    <section
      aria-labelledby="features-heading"
      className={cn("py-20 sm:py-24 md:py-28", shellPaddingX)}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-end md:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-fg-soft">
              ◇ product
            </p>
            <h2 id="features-heading" className="mt-3 text-fg">
              What you get on{" "}
              <span className="tally-italic-accent">day one</span>.
            </h2>
          </div>
          <p className="leading-relaxed text-fg-muted">
            Everything here is designed to read as one system — tone, spacing, and
            surfaces pulled from the same Tally-inspired rulebook.
          </p>
        </div>

        <ul className="grid gap-6 md:grid-cols-3 md:gap-8">
          {FEATURES.map(({ title, description }) => (
            <li
              key={title}
              className="flex flex-col rounded-[20px] border border-border bg-canvas p-8"
            >
              <h3 className="text-fg">{title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
