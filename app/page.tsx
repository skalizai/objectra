import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { ArchitectureSection } from "@/components/landing/architecture";
import { CtaBand } from "@/components/landing/cta-band";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <PipelinePreview />
        <FeatureGrid />
        <ArchitectureSection />
        <CtaBand />
      </main>
      <LandingFooter />
    </>
  );
}
