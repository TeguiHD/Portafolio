"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useMateria, useSeccionActiva } from "@/modules/materia/Materia";
import { casos } from "@/modules/landing/portada/datos/casos";
import { Vista } from "./Vista";
import "./proyectos.css";

/** Cada captura .jpg tiene versiones WebP por ancho (public/images/projects/viva/<nombre>-800.webp…): el navegador baja la
 *  que le sirve (en celular ~30 KB en vez de 130 KB). El JPEG queda como respaldo y para la versión sin JavaScript. */
function variantes(ruta: string, anchos: number[]): string | undefined {
    if (!ruta.endsWith(".jpg")) return undefined;
    return anchos.map((w) => `${ruta.slice(0, -4)}-${w}.webp ${w}w`).join(", ");
}

/** El proyecto privado no tiene captura: su alcance se dibuja (intranet → cursos, aula virtual, certificados). */
function dibujarEsquema(): string {
    const c = document.createElement("canvas"), g = c.getContext("2d")!; c.width = 1440; c.height = 900;
    g.fillStyle = "#0b0f15"; g.fillRect(0, 0, 1440, 900);
    const caja = (x: number, y: number, w: number, h: number, texto: string, fuerte = false) => {
        g.beginPath(); g.roundRect(x, y, w, h, 26); g.fillStyle = fuerte ? "#5eead4" : "#16323a"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#5eead4"; g.stroke();
        g.fillStyle = fuerte ? "#06231f" : "#e8edf3"; g.font = "700 44px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, x + w / 2, y + h / 2 + 2);
    };
    g.strokeStyle = "#5eead4"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath();
    g.moveTo(720, 300); g.lineTo(720, 430); g.moveTo(250, 430); g.lineTo(1190, 430);
    for (const x of [250, 720, 1190]) { g.moveTo(x, 430); g.lineTo(x, 560); }
    g.stroke();
    caja(500, 160, 440, 140, "Intranet", true); caja(60, 560, 380, 150, "Cursos"); caja(530, 560, 380, 150, "Aula virtual"); caja(1000, 560, 380, 150, "Certificados");
    return c.toDataURL("image/png");
}

/**
 * Proyectos: la materia toma los colores de la captura real y la arma como mosaico; recién entonces
 * aparece la imagen nítida. Se arma cuando el marco está a la vista (no antes) y se repite al volver.
 */
export function Proyectos() {
    const motor = useMateria(), activa = useSeccionActiva("proyectos");
    const [caso, setCaso] = useState(0), [vista, setVista] = useState(0), [lista, setLista] = useState(false);
    const [origen, setOrigen] = useState(""), [origenCelular, setOrigenCelular] = useState("");
    const escena = useRef<HTMLDivElement>(null), foto = useRef<HTMLImageElement>(null);
    const turno = useRef(0), reloj = useRef(0), cubre = useRef(0), aLaVista = useRef(false), enSeccion = useRef(false), quieto = useRef(false), estaLista = useRef(false), esquema = useRef("");
    const c = casos[caso];

    const rota = useRef(false); // la captura pedida no cargó
    const mostrar = (v: boolean) => { estaLista.current = v; setLista(v); };
    const listo = () => (enSeccion.current && aLaVista.current) || quieto.current;
    const ocultar = useCallback(() => { turno.current++; clearTimeout(reloj.current); clearTimeout(cubre.current); motor?.cubrir(false); mostrar(false); }, [motor]);
    // La captura nítida aparece 1,35 s después de que la materia empieza a armarla; 0,95 s más tarde la materia deja de pintarse debajo.
    const revelar = useCallback((n: number) => {
        const img = foto.current;
        // Nada que mostrar mientras la captura pedida sigue cargando. Si falló, el marco se muestra igual: no se queda esperando.
        if (!listo() || (!rota.current && (!img || !img.complete || !img.naturalWidth))) return;
        clearTimeout(reloj.current);
        reloj.current = window.setTimeout(() => {
            if (n !== turno.current) return;
            mostrar(true); clearTimeout(cubre.current); cubre.current = window.setTimeout(() => motor?.cubrir(true), 950);
        }, quieto.current ? 150 : 1350);
    }, [motor]);
    const armar = useCallback(() => {
        if (!listo() || estaLista.current) return;
        const img = foto.current;
        motor?.medir(); if (img && img.complete && img.naturalWidth) motor?.imagen(img);
        revelar(turno.current);
    }, [motor, revelar]);

    useEffect(() => { quieto.current = matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);

    // Al cambiar de proyecto o de vista: la imagen se va, y recién entonces cambia su origen.
    const primera = useRef(true), pedido = useRef(0);
    useEffect(() => {
        ocultar();
        // Contador propio: `turno` cambia cada vez que la captura se oculta (también al salir de pantalla),
        // y eso no debe cancelar la carga de la imagen pedida.
        const n = ++pedido.current, actual = casos[caso];
        const id = window.setTimeout(() => {
            if (n !== pedido.current) return;
            rota.current = false;
            let pedida: string;
            if (actual.esquema) { esquema.current ||= dibujarEsquema(); pedida = esquema.current; setOrigen(pedida); setOrigenCelular(""); }
            else { const v = actual.vistas[vista]; pedida = v.escritorio; setOrigen(pedida); setOrigenCelular(v.celular); }
            // Si se vuelve a la misma captura (ir y volver rápido), el origen no cambia y no hay evento de carga: se arma a mano.
            // Solo si la <img> ya lleva la captura pedida: si React aún no la cambió, la que está completa es la anterior, y la
            // materia armaba (y el marco revelaba) la vista vieja con el botón de la nueva marcado.
            requestAnimationFrame(() => { const img = foto.current; if (n === pedido.current && img && img.getAttribute("src") === pedida && img.complete && img.naturalWidth) { motor?.medir(); motor?.imagen(img); revelar(turno.current); } });
        }, primera.current ? 0 : 320);
        primera.current = false;
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caso, vista]);

    useEffect(() => { enSeccion.current = activa; if (activa) armar(); }, [activa, armar]);
    useEffect(() => {
        const e = escena.current; if (!e) return;
        const ojo = new IntersectionObserver((es) => {
            const r = es[es.length - 1].intersectionRatio; // si llegan varios avisos juntos, vale el último
            if (r >= 0.6 && !aLaVista.current) { aLaVista.current = true; armar(); }
            else if (r < 0.6) { aLaVista.current = false; if (r < 0.15) ocultar(); }
        }, { threshold: [0, 0.15, 0.6, 0.8] });
        ojo.observe(e);
        return () => ojo.disconnect();
    }, [armar, ocultar]);

    // Soltar la captura la vuelve a armar; cambiar el ancho de la ventana rehace el mosaico.
    useEffect(() => {
        const soltar = () => { if (!estaLista.current) revelar(turno.current); };
        // Solo el ancho cambia el marco (va con aspect-ratio). En el celular, la barra del navegador cambia el alto
        // a cada rato al desplazar: rehacer el mosaico ahí deshacía la captura sin motivo.
        let rt = 0, ancho = innerWidth;
        const redimensionar = () => {
            if (innerWidth === ancho) return; ancho = innerWidth;
            clearTimeout(rt); rt = window.setTimeout(() => { const img = foto.current; motor?.medir(); if (img && img.complete && img.naturalWidth) motor?.imagen(img); }, 260);
        };
        addEventListener("pointerup", soltar); addEventListener("pointercancel", soltar); addEventListener("resize", redimensionar);
        return () => { removeEventListener("pointerup", soltar); removeEventListener("pointercancel", soltar); removeEventListener("resize", redimensionar); clearTimeout(rt); };
    }, [motor, revelar]);
    useEffect(() => () => { clearTimeout(reloj.current); clearTimeout(cubre.current); }, []);

    // Con el mouse, apretar la captura la deshace para jugar con la materia. Con el dedo, apretar es empezar a desplazar:
    // solo un toque (sin deslizar) la deshace, y al soltar se vuelve a armar.
    const toque = useRef<{ x: number; y: number } | null>(null);
    const bajar = (e: React.PointerEvent) => { if (e.pointerType === "touch") toque.current = { x: e.clientX, y: e.clientY }; else ocultar(); };
    const subir = (e: React.PointerEvent) => {
        const t = toque.current; toque.current = null;
        if (e.pointerType === "touch" && t && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12) ocultar();
    };

    const alCargar = () => { const img = foto.current; if (!img) return; rota.current = false; motor?.medir(); motor?.imagen(img); revelar(turno.current); };
    const alt = c.esquema ? "Esquema del alcance: una intranet con cursos, aula virtual y certificados." : `Captura real de ${c.corto}: ${c.vistas[vista]?.nombre.toLowerCase() ?? ""}.`;
    const teclas = (e: React.KeyboardEvent) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const k = (caso + (e.key === "ArrowRight" ? 1 : casos.length - 1)) % casos.length;
        setCaso(k); setVista(0);
        (e.currentTarget.querySelectorAll("button")[k] as HTMLElement | undefined)?.focus();
    };

    return (
        <section id="proyectos" className="plano" data-forma="imagen" data-ancla="#ancla-imagen" aria-labelledby="pr-titulo">
            <span className="fantasma" aria-hidden="true">{casos.length}</span>
            <Vista className="ancho">
                <div className="pr-cab">
                    <h2 id="pr-titulo"><span className="linea-r"><span>Proyectos</span></span></h2>
                    <div className="pr-nombres" role="tablist" aria-label="Proyectos" data-sube="" onKeyDown={teclas}>
                        {casos.map((x, k) => (
                            <button key={x.id} type="button" role="tab" aria-selected={k === caso} tabIndex={k === caso ? 0 : -1} onClick={() => { if (k !== caso) { setCaso(k); setVista(0); } }}>{x.corto}</button>
                        ))}
                    </div>
                </div>
                <div className={`pr-escena${lista ? " pr-lista" : ""}${c.esquema ? " pr-sin-fono" : ""}`} id="pr-escena" ref={escena} data-sube="" style={{ "--i": 1 } as CSSProperties}>
                    <div className="pr-marco">
                        <div className="pr-barra" aria-hidden="true"><i /><i /><i /><span className="pr-url" id="pr-url">{c.direccion}</span></div>
                        <div className="pr-lienzo" id="ancla-imagen" onPointerDown={bajar} onPointerUp={subir}>
                            <img className="pr-foto" id="pr-foto" ref={foto} src={origen || undefined} srcSet={variantes(origen, [800, 1440])} sizes="(max-width: 760px) calc(100vw - 40px), 710px" alt={alt} decoding="async" onLoad={alCargar} onError={() => { rota.current = true; revelar(turno.current); }} draggable={false} />
                            {/* Sin JavaScript no hay materia que arme la captura: se muestra la del primer proyecto. */}
                            <noscript><img className="pr-foto" src={casos[0].vistas[0].escritorio} alt={`Captura real de ${casos[0].corto}.`} /></noscript>
                        </div>
                    </div>
                    <div className="pr-fono" aria-hidden="true">
                        {origenCelular && <img id="pr-foto-m" src={origenCelular} srcSet={variantes(origenCelular, [200, 400])} sizes="(max-width: 820px) 96px, 190px" alt="" decoding="async" loading="lazy" />}
                    </div>
                </div>
                <div className="pr-pie" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                    <p className="pr-tipo" id="pr-tipo">{c.tipo}</p>
                    <div className="pr-vistas" id="pr-vistas" role="group" aria-label={`Pantallas de ${c.corto}`}>
                        {c.vistas.map((v, k) => <button key={v.nombre} type="button" aria-pressed={k === vista} onClick={() => setVista(k)}>{v.nombre}</button>)}
                    </div>
                    <a className="enlace-ir" id="pr-ir" href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener" : undefined} hidden={c.esquema}>{c.cta} ↗</a>
                </div>
            </Vista>
        </section>
    );
}
