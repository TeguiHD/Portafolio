import type { Metadata } from "next";
import { Navbar } from "@/modules/landing/layout/Navbar";
import { FooterSection } from "@/modules/landing/sections/FooterSection";
import { PulsePageClient } from "@/modules/pulse/components/PulsePageClient";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Blog interactivo con noticias técnicas, seguridad, mercado, clima y actividad real de GitHub en una experiencia tipo command center.",
};

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#030305] text-gray-100">
      <Navbar />
      <div className="flex-1 pt-24">
        <PulsePageClient />
      </div>
      <FooterSection />
    </div>
  );
}
