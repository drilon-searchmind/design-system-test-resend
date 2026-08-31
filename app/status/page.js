import { FeatureStatusView } from "@/components/status/feature-status-view";

export const metadata = {
  title: "Hvor langt er vi? · 1337-crm by Searchmind",
  description: "Overblik over features og status i Searchmind Agency OS.",
  robots: { index: false, follow: false },
};

export default function FeatureStatusPage() {
  return <FeatureStatusView />;
}
