import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { IntroSection } from "@/components/marketing/intro-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { site } from "@/config/site";

export const metadata = {
  title: `${site.branding}`,
  description: site.description,
};

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <IntroSection />
      <FeaturesSection />
      <CtaSection />
      <MarketingFooter />
    </main>
  );
}
