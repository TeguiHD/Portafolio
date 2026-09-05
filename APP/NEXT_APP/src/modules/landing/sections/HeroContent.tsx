import { Wrench } from "lucide-react";
import Link from "next/link";
import { TOOL_COUNT } from "@/lib/tool-count";

/**
 * Server-rendered hero content — LCP critical.
 * This component renders instantly without waiting for JS hydration.
 * Interactive elements (typing, counters, dashboard) are loaded separately.
 */
export function HeroContent() {
  return (
    <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col">
      {/* Terminal Header — static placeholder visible instantly */}
      <div className="mb-4 sm:mb-6 md:mb-8 hero-fade-in" style={{ animationDelay: "0s" }}>
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="h-4 w-px bg-white/10" aria-hidden="true" />
          <svg className="w-4 h-4 text-emerald-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
          <code className="text-xs sm:text-sm font-mono text-emerald-400">
            <span className="text-gray-500">$</span>{" "}
            {/* Placeholder text — will be replaced by client-side typing effect */}
            <span id="hero-typing-target" className="inline-block min-w-[28ch] sm:min-w-[31ch]">Transformo ideas en productos</span>
            <span id="hero-typing-cursor" className="text-emerald-500" aria-hidden="true">▋</span>
          </code>
        </div>
      </div>

      {/* Main Headline — LCP critical: rendered on server, visible without JS */}
      <div className="space-y-1 sm:space-y-2 md:space-y-4 mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-left hero-fade-in" style={{ animationDelay: "0.1s" }}>
          <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-gray-400 tracking-tight">
            Desarrollo
          </span>
          <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white xl:animate-glitch leading-[0.9]">
            SOLUCIONES.
          </span>
        </h1>

        <h2 className="text-left hero-fade-in" style={{ animationDelay: "0.2s" }}>
          <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light italic text-gray-500 tracking-tight">
            Entrego
          </span>
          <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-outline-white leading-[0.9] hover:text-white transition-all duration-500">
            RESULTADOS.
          </span>
        </h2>
      </div>

      {/* Value Proposition */}
      <div className="max-w-2xl mb-6 sm:mb-8 md:mb-10 hero-fade-in" style={{ animationDelay: "0.3s" }}>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 leading-relaxed">
          <span className="text-white font-semibold">Desarrollador Full Stack</span> que transforma{" "}
          <span className="text-blue-400 font-medium">problemas complejos</span> en{" "}
          <span className="text-emerald-400 font-medium">productos funcionales</span>.{" "}
          Prueba mis herramientas gratuitas o conoce los sistemas que he construido.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 hero-fade-in" style={{ animationDelay: "0.4s" }}>
        <Link
          href="/herramientas"
          className="inline-flex flex-row items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-bold bg-white text-black hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 md:animate-glow-pulse whitespace-nowrap"
        >
          <Wrench className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Usar herramientas</span>
        </Link>
        <Link
          href="#contact"
          className="rounded-full px-8 py-4 text-lg font-medium text-white hover:bg-white/5 border border-white/20 hover:border-white/40 transition-all"
        >
          Hablemos de tu proyecto
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-neutral-300">
        <Link href="/herramientas" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-teal-300">{TOOL_COUNT} herramientas gratuitas</Link>
        <Link href="#casos" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-teal-300">Proyectos que puedes conocer</Link>
        <Link href="/sobre-mi" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-teal-300">Quién las construye</Link>
      </div>
    </div>
  );
}
