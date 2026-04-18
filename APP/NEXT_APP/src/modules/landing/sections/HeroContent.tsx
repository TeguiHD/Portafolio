import { Zap } from "lucide-react";
import Link from "next/link";

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
          Sin rodeos. Sin demoras.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 hero-fade-in" style={{ animationDelay: "0.4s" }}>
        <Link
          href="/blog"
          className="inline-flex flex-row items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-bold bg-white text-black hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 md:animate-glow-pulse whitespace-nowrap"
        >
          <Zap className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Explorar Blog</span>
        </Link>
        <Link
          href="#contact"
          className="rounded-full px-8 py-4 text-lg font-medium text-white hover:bg-white/5 border border-white/20 hover:border-white/40 transition-all"
        >
          Agendar Reunión
        </Link>
      </div>

      {/* Stats — Server-rendered with final values (progressive enhancement) */}
      <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12 max-w-xl hero-fade-in" style={{ animationDelay: "0.6s" }}>
        <div className="group text-left">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tabular-nums" id="hero-counter-projects">500</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400">+</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">Proyectos</span>
          </div>
        </div>
        <div className="group text-left">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tabular-nums" id="hero-counter-uptime">99</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400">.9%</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">Uptime</span>
          </div>
        </div>
        <div className="group text-left">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tabular-nums">&lt;24</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400">h</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <svg className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">Respuesta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
