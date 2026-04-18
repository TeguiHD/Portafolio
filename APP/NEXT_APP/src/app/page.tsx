import { HeroSection } from "@/modules/landing/sections/HeroSection";
import { Navbar } from "@/modules/landing/layout/Navbar";
import {
  DeferredLandingSection,
  type DeferredLandingSectionId,
} from "@/modules/landing/sections/DeferredLandingSection";

const deferredSections: DeferredLandingSectionId[] = [
  "tools-belt",
  "vault",
  "casos",
  "tecnologias",
  "architecture",
  "contact",
  "footer",
];

export default function Home() {
  return (
    <main className="relative min-h-screen selection:bg-accent-success/30">
      <Navbar />

      {/* 1. Hero: Impacto — loaded eagerly (LCP critical) */}
      <HeroSection />

      {/* 2-7. Sections under the fold: deferred until near viewport */}
      {deferredSections.map((section) => (
        <DeferredLandingSection key={section} section={section} />
      ))}
    </main>
  );
}
