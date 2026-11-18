import { FeatureStatusView } from "@/components/status/feature-status-view";

export const metadata = {
  title: "Hvor langt er vi? · Searchmind 1337 OS",
  description: "Overblik over features og status i Searchmind 1337 OS.",
  robots: { index: false, follow: false },
};

export default function FeatureStatusPage() {
  return <FeatureStatusView />;
}
