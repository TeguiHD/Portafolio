import type { Metadata } from "next";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { PulsePageClient } from "@/modules/pulse/components/PulsePageClient";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Blog interactivo con noticias técnicas, seguridad, mercado, clima y actividad real de GitHub en una experiencia tipo command center.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#030305] text-gray-100">
      <Navbar />
      <div className="flex-1 pt-24">
        <div className="mx-auto max-w-[1600px] px-4 pb-6 pt-2 sm:px-6 lg:px-8">
          <p className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-200/70">
            Blog evolutivo
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Digital Pulse: noticias, seguridad y mercado en vivo
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
            Tecnología, ciberseguridad, indicadores de mercado, clima y actividad de
            GitHub reunidos en un panel tipo command center.
          </p>
        </div>
        <PulsePageClient />
      </div>
      <FooterSection />
    </div>
  );
}
