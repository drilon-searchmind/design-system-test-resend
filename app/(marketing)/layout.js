import { MarketingSiteHeader } from "@/components/layout/marketing-site-header";

export default function MarketingLayout({ children }) {
  return (
    <div
      data-surface="marketing-tally"
      className="flex min-h-0 flex-1 flex-col text-fg"
    >
      <MarketingSiteHeader />
      {children}
    </div>
  );
}
