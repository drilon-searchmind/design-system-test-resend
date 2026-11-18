import { shellPaddingX } from "@/config/shell";
import { cn } from "@/lib/utils";

export const metadata = { title: "Terms · Searchmind 1337 OS" };

export default function TermsPage() {
  return (
    <main
      className={cn(
        "mx-auto flex flex-1 max-w-prose flex-col gap-4 py-24",
        shellPaddingX,
      )}
    >
      <h1 className="text-fg">Terms</h1>
      <p className="text-sm text-fg-muted">Terms content goes here.</p>
    </main>
  );
}
