import type { Metadata } from "next";
import { ShowcaseSection } from "@/modules/landing/sections/ShowcaseSection";
import { ClosingSignature } from "@/modules/landing/sections/ClosingSignature";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { HeroSection } from "@/modules/landing/portada/hero/HeroSection";
import { PortadaMotion } from "@/modules/landing/portada/PortadaMotion";
import { FondoVivo } from "@/modules/landing/portada/FondoVivo";
import "@/modules/landing/portada/portada.css";
import { Navbar } from "@/modules/landing/layout/Navbar";
import {
  DeferredLandingSection,
  type DeferredLandingSectionId,
} from "@/modules/landing/sections/DeferredLandingSection";
import { NoScriptLanding } from "@/components/seo/NoScriptLanding";
import { VisualEnhancements } from "@/modules/landing/layout/VisualEnhancements";
import { LandingMotionProvider } from "@/modules/landing/motion/LandingMotionProvider";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const deferredSections: (DeferredLandingSectionId | "casos")[] = [
  "tools-belt",
  "vault",
  "casos",
  "tecnologias",
  "architecture",
  "contact",
];

export default function Home() {
  return (
    <LandingMotionProvider>
    <PortadaMotion>
      <FondoVivo />
      <VisualEnhancements />
      <main className="portada relative min-h-screen selection:bg-accent-success/30">
        <Navbar />

        {/* 1. Hero: Impacto — loaded eagerly (LCP critical) */}
        <HeroSection />

        {/* Proyectos en HTML inicial; se difieren las secciones interactivas. */}
        {deferredSections.map((section) => (
          section === "casos"
            ? <ShowcaseSection key={section} />
            : <DeferredLandingSection key={section} section={section} />
        ))}

        {/* Respaldo para crawlers que no ejecutan JS (GPTBot, ClaudeBot, CCBot...):
            complementa las secciones interactivas que se cargan tras hidratar. */}
        <NoScriptLanding />
      </main>
    </PortadaMotion>
    <ClosingSignature />
    <FooterSection />
    </LandingMotionProvider>
  );
}
