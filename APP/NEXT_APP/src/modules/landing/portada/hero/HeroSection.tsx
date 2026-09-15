import { ArrowDown, ArrowUpRight, Code2, Wrench } from "lucide-react";
import Link from "next/link";
import { EntradaHero } from "../EntradaHero";
import { HeroMesa } from "./HeroMesa";
import "./hero.css";

/**
 * Hero de la portada — componente de servidor.
 *
 * El texto (insignia, h1, párrafo, CTA) se renderiza en el servidor: el párrafo es
 * el elemento LCP y nunca se anima ni se retiene. La mesa giratoria (cliente)
 * se monta a la derecha con los cuatro instrumentos reales.
 */
export function HeroSection() {
  return (
    <section id="hero" aria-label="Presentación principal" className="p-hero">
      <EntradaHero />
      <div className="p-hero-fondo" aria-hidden="true">
        <span className="a" />
        <span className="b" />
        <span className="g" />
      </div>
      <div className="p-wrap p-hero-wrap">
        <div data-hero-content className="p-hero-texto">
          <div className="p-insignia">
            <Code2 size={16} strokeWidth={1.6} aria-hidden="true" />
            <span>Desarrollador Full Stack</span>
          </div>
          <h1>
            <span className="ln"><span className="l1">Desarrollo</span></span>
            <span className="ln"><span className="l2">SOLUCIONES.</span></span>
          </h1>
          <p className="sub">
            Herramientas útiles, interfaces cuidadas y desarrollo web a medida.
            Explora lo que construyo y pruébalo por ti mismo.
          </p>
          <div className="p-hero-acciones">
            <Link href="/herramientas" className="p-cta" data-magnetic>
              <Wrench aria-hidden="true" />
              <span>Usar herramientas</span>
            </Link>
            <Link href="#contact" className="p-cta fantasma" data-magnetic>
              Hablemos de tu proyecto
              <ArrowUpRight className="up" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="p-hero-escena">
          <HeroMesa />
        </div>
      </div>
      <a href="#tools-belt" className="p-explorar">
        Explorar <ArrowDown size={14} aria-hidden="true" />
      </a>
    </section>
  );
}
