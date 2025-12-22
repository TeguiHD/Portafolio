import { ContactSection } from "@/modules/landing/sections/ContactSection";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { ForbiddenVaultSection } from "@/modules/landing/sections/ForbiddenVaultSection";
import { HeroSection } from "@/modules/landing/sections/HeroSection";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { SecurityArchitectureSection } from "@/modules/landing/sections/SecurityArchitectureSection";
import { ShowcaseSection } from "@/modules/landing/sections/ShowcaseSection";
import { TechnologiesSection } from "@/modules/landing/sections/TechnologiesSection";
import { ToolsBeltSection } from "@/modules/landing/sections/ToolsBeltSection";

export default function Home() {
  return (
    <main className="relative min-h-screen selection:bg-accent-success/30">
      <Navbar />

      {/* 1. Hero: Impacto (3s) */}
      <HeroSection />

      {/* 2. Herramientas: Valor inmediato */}
      <ToolsBeltSection />

      {/* 3. Acceso Exclusivo: Escasez y Autoridad */}
      <ForbiddenVaultSection />

      {/* 4. Proyectos: Evidencia Social */}
      <ShowcaseSection />

      {/* 5. Stack: Credibilidad Técnica */}
      <TechnologiesSection />

      {/* 6. Arquitectura: Mentalidad Senior */}
      <SecurityArchitectureSection />

      {/* 7. Contacto & Footer: Conversión */}
      <ContactSection />
      <FooterSection />
    </main>
  );
}
