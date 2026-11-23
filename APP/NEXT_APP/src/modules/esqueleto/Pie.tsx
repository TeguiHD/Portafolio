"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMateria } from "@/modules/materia/Materia";
import { BotonInstalar } from "@/components/pwa/BotonInstalar";
import "./pie.css";

const ENLACES = [
    ["/servicios", "Servicios"], ["/#proyectos", "Proyectos"], ["/herramientas", "Herramientas"], ["/blog", "Blog"], ["/indice-web-chilena", "Índice web chilena"], ["/sobre-mi", "Sobre mí"],
    ["/cotizacion", "Portal de clientes"], ["/privacidad", "Privacidad"], ["/terminos", "Términos"],
] as const;

/** Hora de Santiago y posición del astro en el arco del día (de 6 a 18 h recorre el arco; de noche queda en el horizonte). */
function santiago(ahora: Date) {
    const p = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }).formatToParts(ahora);
    const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24, m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
    const f = (h + m / 60 - 6) / 12, dia = f >= 0 && f <= 1, a = Math.PI * (1 - (dia ? f : 0.5));
    return { hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, dia, cx: 60 + 52 * Math.cos(a), cy: dia ? 58 - 52 * Math.sin(a) : 58 };
}

/** El pie: la hora de Santiago con el arco del día, los enlaces en una línea y un anillo que muestra cuánto se ha leído. */
export function Pie() {
    const motor = useMateria();
    const [reloj, setReloj] = useState<ReturnType<typeof santiago> | null>(null); // se llena en el navegador: la hora del servidor no sirve
    useEffect(() => {
        const marcar = () => setReloj(santiago(new Date()));
        marcar(); const id = setInterval(marcar, 20_000);
        return () => clearInterval(id);
    }, []);

    return (
        <footer className="suelo">
            {/* El suelo en perspectiva: la cuadrícula avanza con translate (la mueve la GPU, sin repintar cada cuadro). */}
            <div className="suelo-plano" aria-hidden="true"><i /></div>
            <div className="ancho suelo-in">
                {/* Solo en celular: la marca encabeza el pie (en ancho la firma de arriba ya cumple ese papel). */}
                <p className="sl-marca" aria-hidden="true">nicoholas<i>.</i>dev</p>
                <div className="sl-reloj" title="Hora de Santiago de Chile">
                    <svg viewBox="0 0 120 64" aria-hidden="true">
                        <path className="sl-arco" d="M8 58 A52 52 0 0 1 112 58" /><line x1="2" y1="58" x2="118" y2="58" className="sl-horizonte" />
                        <circle id="sl-astro" r="6" cx={reloj ? reloj.cx.toFixed(1) : 60} cy={reloj ? reloj.cy.toFixed(1) : 58} style={{ opacity: reloj && !reloj.dia ? 0.35 : 1 }} />
                    </svg>
                    <p><b id="hora">{reloj ? reloj.hora : "--:--"}</b><span id="sl-momento">Santiago de Chile{reloj ? ` · ${reloj.dia ? "de día" : "de noche"}` : ""}</span></p>
                </div>
                <nav className="sl-ir" aria-label="Sitio">
                    {ENLACES.map(([href, texto]) => <Link key={href} href={href}>{texto}</Link>)}
                    <BotonInstalar className="sl-instalar" />
                </nav>
                <a className="sl-subir" href="#contenido" aria-label="Volver al inicio"
                    onClick={(e) => {
                        e.preventDefault(); motor?.sacudir(14); scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                        // El foco sube con la página: con el teclado, el siguiente Tab seguía desde el pie.
                        document.getElementById("contenido")?.focus({ preventScroll: true });
                    }}>
                    <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" /><circle className="sl-avance" cx="32" cy="32" r="28" pathLength={1} /><path d="M32 42V23M24 30l8-8 8 8" /></svg>
                </a>
            </div>
            <p className="sl-fin">© {new Date().getFullYear()} <Link href="/sobre-mi">Nicoholas Lopetegui</Link></p>
        </footer>
    );
}
