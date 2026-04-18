import { HeroContent } from "./HeroContent";
import { HeroInteractive } from "./HeroInteractive";

/**
 * HeroSection — Server Component (no "use client")
 *
 * LCP OPTIMIZATION: The critical text content (h1, h2, p) is server-rendered
 * in HeroContent, ensuring it appears immediately without waiting for JS hydration.
 * Interactive elements (typing animation, counters, dashboard) are loaded
 * progressively via the HeroInteractive client component.
 *
 * Previous LCP: ~4.3s → Target: <2.5s
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Presentación principal"
      className="relative min-h-screen flex flex-col justify-start items-center overflow-hidden px-4 sm:px-6 pt-16 sm:pt-20 pb-16"
    >
      {/* Background Effects — pure CSS, no JS blocking */}
      <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-blue-600/10 rounded-full blur-[120px] animate-none lg:animate-pulse-slow" />
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-600/10 rounded-full blur-[80px] animate-none lg:animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12 my-auto">
        {/* Left: Server-rendered LCP-critical content */}
        <HeroContent />

        {/* Right: Client-side interactive elements (non-blocking) */}
        <HeroInteractive />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="hidden lg:block absolute top-[15%] right-[5%] w-[400px] h-[400px] border border-white/5 rounded-full animate-[spin_80s_linear_infinite]" />
        <div className="hidden xl:block absolute top-[15%] right-[5%] w-[600px] h-[600px] border border-white/[0.03] rounded-full animate-[spin_60s_linear_infinite_reverse]" />
      </div>
    </section>
  );
}
