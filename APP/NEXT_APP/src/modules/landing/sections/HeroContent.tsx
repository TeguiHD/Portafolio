import { Wrench } from "lucide-react";
import Link from "next/link";

/**
 * Server-rendered hero content — LCP critical.
 * This component renders instantly without waiting for JS hydration.
 * The particle signature is loaded separately.
 */
export function HeroContent() {
  return (
    <div data-hero-content className="w-full min-w-0 lg:flex-1 flex flex-col">
      {/* Static terminal introduction; readable before hydration. */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="h-4 w-px bg-white/10" aria-hidden="true" />
          <svg className="w-4 h-4 shrink-0 text-emerald-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
          <code className="text-[10px] sm:text-sm font-mono text-emerald-400">
            <span className="text-gray-500">$</span>{" "}

            <span className="inline-block max-w-full">Transformo ideas en productos</span>
            <span className="text-emerald-500" aria-hidden="true">▋</span>
          </code>
        </div>
      </div>

      {/* Main Headline — LCP critical: rendered on server, visible without JS */}
      <div className="space-y-1 sm:space-y-2 md:space-y-4 mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-left">
          <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-gray-400 tracking-tight">
            Desarrollo
          </span>
          <span className="block text-[clamp(2.1rem,8.5vw,3.75rem)] md:text-7xl lg:text-[clamp(3.5rem,6.3vw,6rem)] font-black tracking-tighter text-white leading-[0.9]">
            SOLUCIONES.
          </span>
        </h1>

        <h2 className="text-left">
          <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light italic text-gray-500 tracking-tight">
            Entrego
          </span>
          <span className="block text-[clamp(2.1rem,8.5vw,3.75rem)] md:text-7xl lg:text-[clamp(3.5rem,6.3vw,6rem)] font-black tracking-tighter text-outline-white leading-[0.9] text-white/90">
            RESULTADOS.
          </span>
        </h2>
      </div>

      {/* Value Proposition */}
      <div className="max-w-3xl mb-6 sm:mb-8 md:mb-10">
        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 leading-relaxed">
          <span className="text-white font-semibold">Desarrollador Full Stack</span> que transforma{" "}
          <span className="text-blue-400 font-medium">problemas complejos</span> en{" "}
          <span className="text-emerald-400 font-medium">productos funcionales</span>.{" "}
          Prueba mis herramientas gratuitas o conoce los sistemas que he construido.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href="/herramientas"
          className="inline-flex flex-row items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold bg-white text-black hover:bg-gray-100 transition-all motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 whitespace-nowrap"
        >
          <Wrench className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Usar herramientas</span>
        </Link>
        <Link
          href="#contact"
          className="rounded-full px-6 py-3.5 text-base font-medium text-white hover:bg-white/5 border border-white/20 hover:border-white/40 transition-all"
        >
          Hablemos de tu proyecto
        </Link>
      </div>

    </div>
  );
}
