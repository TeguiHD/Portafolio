import { ArrowUpRight, Code2, Wrench } from "lucide-react";
import Link from "next/link";

/**
 * Server-rendered hero content — LCP critical.
 * This component renders instantly without waiting for JS hydration.
 * The particle signature is loaded separately.
 */
export function HeroContent() {
  return (
    <div data-hero-content className="w-full min-w-0 lg:flex-1 flex flex-col">
      {/* Readable before hydration, with no decorative loading sequence. */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-teal-200/15 bg-teal-200/[0.035] px-3.5 py-2 text-xs text-teal-100/80">
          <Code2 size={16} strokeWidth={1.6} aria-hidden="true" />
          <span>Desarrollador Full Stack</span>
        </div>
      </div>

      {/* Main Headline — LCP critical: rendered on server, visible without JS */}
      <div className="space-y-1 sm:space-y-2 md:space-y-4 mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-left">
          <span className="mb-2 block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-slate-300 tracking-tight">
            Desarrollo
          </span>
          <span className="block text-[clamp(2.1rem,8.5vw,3.75rem)] md:text-7xl lg:text-[clamp(3.5rem,6.3vw,6rem)] font-black tracking-tighter text-white leading-[0.9]">
            SOLUCIONES.
          </span>
        </h1>

      </div>

      {/* Value Proposition */}
      <div className="max-w-lg mb-7 sm:mb-9">
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
          Herramientas útiles, interfaces cuidadas y desarrollo web a medida.
          Explora lo que construyo y pruébalo por ti mismo.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href="/herramientas"
          className="inline-flex min-h-12 flex-row items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold bg-[#b2ebd8] text-[#102b25] hover:bg-[#cbf6e8] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200 whitespace-nowrap"
        >
          <Wrench className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Usar herramientas</span>
        </Link>
        <Link
          href="#contact"
          className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium text-slate-200 hover:bg-white/5 border border-white/15 hover:border-white/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-200"
        >
          Hablemos de tu proyecto
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>

    </div>
  );
}
