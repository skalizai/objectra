import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { CtaBand } from "@/components/landing/cta-band";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <CtaBand />
      </main>
      <LandingFooter />
    </>
  );
}
