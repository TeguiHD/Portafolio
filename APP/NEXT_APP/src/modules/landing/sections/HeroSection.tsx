import { HeroDashboard } from "./HeroDashboard";
import { HeroContent } from "./HeroContent";
import { ArrowDown } from "lucide-react";

/**
 * HeroSection — Server Component (no "use client")
 *
 * LCP OPTIMIZATION: The critical text content (h1, h2, p) is server-rendered
 * in HeroContent, ensuring it appears immediately without waiting for JS hydration.
 * The scroll-driven particle signature now closes the page above the footer.
 *
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Presentación principal"
      className="relative min-h-screen flex flex-col justify-start items-center overflow-hidden px-4 sm:px-6 pt-28 sm:pt-32 pb-24"
    >
      {/* Background Effects — pure CSS, no JS blocking */}
      <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-600/10 rounded-full blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12 my-auto">
        {/* Left: Server-rendered LCP-critical content */}
        <HeroContent />
        <HeroDashboard />

      </div>
      <a href="#tools-belt" className="absolute bottom-5 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-4 text-xs text-slate-400 hover:text-teal-200">Explorar <ArrowDown size={14} aria-hidden="true" /></a>
    </section>
  );
}
