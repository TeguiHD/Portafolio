"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { useMotionActivity } from "@/modules/landing/motion/LandingMotionProvider";
import { CVOptimizerDemo, FinanceDemo, SecurityDemo } from "@/modules/landing/sections/vault-demos";
import { ConfigMovimiento } from "@/components/motion/ConfigMovimiento";
import { usePortada } from "../PortadaMotion";
import { useRevelar } from "../revelar";
import { onda, useInclinar, useMagnetico } from "../interaccion";
import { cartasMazo, type CartaMazoId } from "../datos/mazo";
import "./mazo.css";

const ICONOS: Record<CartaMazoId, typeof CreditCard> = { finance: CreditCard, cv: Sparkles, audit: ShieldCheck };

function Carta({ carta, indice }: { carta: (typeof cartasMazo)[number]; indice: number }) {
  const { nivel } = usePortada();
  const { ref, active } = useMotionActivity<HTMLDivElement>();
  const pos = useRef<HTMLDivElement>(null);
  const [volteada, setVolteada] = useState(false);
  useInclinar(pos, 6);
  const Icono = ICONOS[carta.id];
  const activa = active && nivel !== "estatico";

  const girar = () => setVolteada((v) => !v);
  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      girar();
    }
  };

  return (
    <div ref={pos} className="p-carta-pos" data-indice={indice} style={{ "--tono": carta.color } as CSSProperties}>
      <div
        ref={ref}
        className={volteada ? "p-carta volteada" : "p-carta"}
        role="button"
        tabIndex={0}
        aria-pressed={volteada}
        aria-label={`${carta.titulo}: ${volteada ? "ver demostración" : "ver descripción"}`}
        data-demo={carta.id}
        data-motion-active={activa ? "true" : "false"}
        onClick={girar}
        onKeyDown={teclado}
      >
        <div className="p-cara">
          <span className="p-brillo" aria-hidden="true" />
          {/* La demostración trae su propia cabecera (título, subtítulo, insignia de demo). */}
          <h3 className="sr-only">{carta.titulo}</h3>
          <div className="p-cara-demo">
            {carta.id === "finance" && <FinanceDemo isActive={activa} />}
            {carta.id === "cv" && <CVOptimizerDemo isActive={activa} />}
            {carta.id === "audit" && <SecurityDemo isActive={activa} />}
          </div>
          <div className="p-cara-pie"><span>Demo</span><em>Toca para más info</em></div>
        </div>
        <div className="p-cara p-dorso">
          <div className="p-cara-cab">
            <span className="p-cara-ico"><Icono size={18} aria-hidden="true" /></span>
            <div>
              <p className="p-cara-titulo">{carta.titulo}</p>
              <small>{carta.subtitulo}</small>
            </div>
          </div>
          <p className="p-dorso-txt">{carta.dorso}</p>
          <div className="p-cara-pie"><span>Datos simulados</span><em>Acceso privado</em></div>
        </div>
      </div>
    </div>
  );
}

/** Mazo de tres cartas en abanico con las demostraciones reales de los sistemas privados. */
export function Mazo() {
  const { nivel, listo } = usePortada();
  const cab = useRevelar<HTMLDivElement>();
  const mazo = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  useMagnetico(cta, 6);

  // Abanico guiado por el scroll desde 640 px, que es donde cabe abrirlo de lado. Más
  // estrecho, la columna se reparte: cada carta llega ladeada y se endereza al entrar.
  useEffect(() => {
    const el = mazo.current;
    if (!el || !listo || nivel === "estatico") return;
    const cartas = Array.from(el.querySelectorAll<HTMLElement>(".p-carta-pos"));
    if (!window.matchMedia("(min-width: 640px)").matches) {
      const repartir = cartas.map((carta, i) =>
        gsap.fromTo(
          carta,
          { rotate: i % 2 === 0 ? -3.5 : 3.5, y: 44, scale: 0.94, transformOrigin: "50% 50%" },
          {
            rotate: 0,
            y: 0,
            scale: 1,
            transformOrigin: "50% 50%",
            ease: "none",
            scrollTrigger: { trigger: carta, start: "top 92%", end: "top 48%", scrub: 0.7 },
          },
        ),
      );
      return () => {
        repartir.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        gsap.set(cartas, { clearProps: "transform" });
      };
    }
    const sep = () => (window.innerWidth < 900 ? 210 : 330);
    gsap.set(cartas, { rotate: 0, x: 0, y: (i: number) => i * 4, zIndex: (i: number) => 10 - i });
    const tw = gsap.to(cartas, {
      rotate: (i: number) => (i - 1) * 10,
      x: (i: number) => (i - 1) * sep(),
      y: (i: number) => Math.abs(i - 1) * 22,
      ease: "none",
      stagger: 0.02,
      scrollTrigger: { trigger: "#vault", start: "top 70%", end: "top 10%", scrub: 0.8 },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
      gsap.set(cartas, { clearProps: "transform,zIndex" });
    };
  }, [nivel, listo]);

  return (
    <ConfigMovimiento>
    <section id="vault" className="p-sec p-mazo-sec">
      <div className="p-wrap">
        <div className="p-mazo-cab">
          <div ref={cab} className="p-cab" data-revelar>
            <span className="eyebrow ambar">Software de uso interno</span>
            <h2>
              <span className="ln"><span>Infraestructura <span className="a">Privada</span></span></span>
            </h2>
            <p className="sub">
              El trabajo que ocurre detrás de una plataforma: organizar la operación, preparar documentos y vigilar lo que pasa.
              Sistemas privados que construyo para uso interno.
            </p>
          </div>
          <Link ref={cta} href="#contact" className="p-cta fantasma" data-magnetic onPointerDown={onda}>
            Conversar sobre un sistema
          </Link>
        </div>
        <p className="p-aviso">
          <b>Vistas de demostración.</b> Los movimientos, documentos, puntuaciones y eventos que ves a continuación son simulados. El acceso a los sistemas reales es privado.
        </p>
        <div className="p-mazo-escena" data-nivel={nivel}>
          <div ref={mazo} className="p-mazo">
            {cartasMazo.map((carta, i) => (
              <Carta key={carta.id} carta={carta} indice={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
    </ConfigMovimiento>
  );
}
