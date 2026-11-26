"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { FAMILIAS, idDeRuta, type App, type HerramientaEscritorio } from "./apps";
import { Glifo, UI } from "./Glifo";
import { ControlesSonido, NOMBRE_FAMILIA } from "./Paneles";
import type { PreferenciasSonido } from "./sonido";
import { FONDOS, type Fondo, type ProyectoEscritorio } from "./tipos";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Los proyectos: la lista a la izquierda y, a la derecha, la captura real, qué es y adónde lleva. */
export function VistaProyectos({ proyectos, alAbrir }: { proyectos: ProyectoEscritorio[]; alAbrir: (id: string) => void }) {
    const [i, setI] = useState(0);
    const id = useId();
    const p = proyectos[i];
    const elegir = (j: number, foco: boolean) => {
        setI(j);
        if (foco) document.getElementById(`${id}-${j}`)?.focus();
    };
    const teclas = (e: KeyboardEvent<HTMLUListElement>) => {
        const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        elegir(Math.max(0, Math.min(proyectos.length - 1, i + d)), true);
    };
    if (!p) return null;
    const destino = p.externo ? null : (() => { const u = new URL(p.href, "https://nicoholas.dev"); return idDeRuta(u.pathname, u.hash); })();
    return (
        <div className="es-py">
            <ul className="es-py-lista" role="listbox" aria-label="Proyectos" onKeyDown={teclas}>
                {proyectos.map((x, j) => (
                    <li key={x.id} id={`${id}-${j}`} role="option" aria-selected={j === i} tabIndex={j === i ? 0 : -1} onClick={() => elegir(j, false)}>
                        <b>{x.titulo}</b><span>{x.tipo}</span>
                    </li>
                ))}
            </ul>
            <article className="es-py-ficha" aria-live="polite">
                <img src={p.imagen} alt={p.imagenAlt} width={1440} height={900} decoding="async" draggable={false} />
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
                {p.externo
                    ? <a href={p.href} target="_blank" rel="noopener">{p.cta} ↗</a>
                    : destino ? <button type="button" className="es-enlace" onClick={() => alAbrir(destino)}>{p.cta}</button> : null}
            </article>
        </div>
    );
}

/** La carpeta de herramientas: todas, por familia, con un buscador. Un clic abre la herramienta en su ventana. */
export function VistaHerramientas({ herramientas, resolver, alAbrir }: { herramientas: HerramientaEscritorio[]; resolver: (id: string) => App | null; alAbrir: (id: string) => void }) {
    const [q, setQ] = useState("");
    const n = sinTildes(q.trim());
    const visibles = useMemo(() => herramientas.filter((t) => !n || sinTildes(`${t.nombre} ${t.familia} ${t.slug}`).includes(n)), [herramientas, n]);
    return (
        <div className="es-hf">
            <div className="es-buscar es-hf-buscar">
                <Glifo d={UI.lupa} />
                <input type="search" className="es-campo" placeholder={`Busca entre las ${herramientas.length} herramientas`} aria-label="Buscar herramientas" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {visibles.length === 0 && <p className="es-nada">Ninguna herramienta se llama así. Prueba con «imagen», «QR» o «clave».</p>}
            {FAMILIAS.map((f) => {
                const de = visibles.filter((t) => t.familia === f);
                if (!de.length) return null;
                return (
                    <section key={f} aria-label={NOMBRE_FAMILIA[f]}>
                        <h3>{NOMBRE_FAMILIA[f]}</h3>
                        <ul>
                            {de.map((t) => {
                                const a = resolver(`herramientas/${t.slug}`);
                                if (!a) return null;
                                return (
                                    <li key={t.slug}>
                                        <button type="button" className="es-hf-item" data-abrir={a.id} style={{ "--c": a.color } as CSSProperties} onClick={() => alAbrir(a.id)}>
                                            <Glifo d={a.glifo} /><span>{a.titulo}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

export interface Ajustes {
    fondo: Fondo; alFondo: (f: Fondo) => void;
    tema: "oscuro" | "claro"; alTema: () => void;
    prefs: PreferenciasSonido | null; cambiarSonido: (p: Partial<PreferenciasSonido>) => void; muestra: () => void;
    alOrdenar: () => void;
}

/** Configuración: el fondo, el tema y el sonido. Se guarda en este navegador. */
export function VistaConfiguracion({ a }: { a: Ajustes }) {
    return (
        <div className="es-cf">
            <section aria-labelledby="es-cf-fondo">
                <h3 id="es-cf-fondo">Fondo</h3>
                <div className="es-seg" role="group" aria-labelledby="es-cf-fondo">
                    {FONDOS.map((f) => <button key={f.id} type="button" aria-pressed={a.fondo === f.id} onClick={() => a.alFondo(f.id)}>{f.nombre.replace("Materia en olas", "Olas").replace("Clima de Santiago", "Clima")}</button>)}
                </div>
                <p>«Clima» muestra el tiempo de ahora en Santiago; «Quieto» detiene la materia y gasta menos batería.</p>
            </section>
            <section aria-labelledby="es-cf-tema">
                <h3 id="es-cf-tema">Tema</h3>
                <div className="es-seg" role="group" aria-labelledby="es-cf-tema">
                    <button type="button" aria-pressed={a.tema === "oscuro"} onClick={() => { if (a.tema !== "oscuro") a.alTema(); }}>Oscuro</button>
                    <button type="button" aria-pressed={a.tema === "claro"} onClick={() => { if (a.tema !== "claro") a.alTema(); }}>Claro</button>
                </div>
            </section>
            <section aria-labelledby="es-cf-sonido">
                <h3 id="es-cf-sonido">Sonido</h3>
                {a.prefs && <ControlesSonido prefs={a.prefs} cambiar={a.cambiarSonido} muestra={a.muestra} />}
            </section>
            <section aria-labelledby="es-cf-iconos">
                <h3 id="es-cf-iconos">Íconos</h3>
                <button type="button" className="es-boton-sec" onClick={a.alOrdenar}>Ordenar los íconos</button>
            </section>
        </div>
    );
}

const ATAJOS: [string, string][] = [
    ["Doble clic o Enter sobre un ícono", "Abre su ventana"],
    ["Arrastrar un ícono", "Lo cambia de lugar en la cuadrícula"],
    ["Ctrl K (⌘K en Mac)", "Abre el inicio con el buscador"],
    ["Arrastrar el título al borde", "Encaja la ventana a un lado; arriba, la maximiza"],
    ["Doble clic en el título", "Maximiza o restaura"],
    ["Sacudir una ventana", "Minimiza las demás"],
    ["Flechas sobre el ícono de una ventana", "La mueven; con Mayúsculas, cambian su tamaño"],
    ["Enter sobre el ícono de una ventana", "Abre sus opciones: acoplar, maximizar, cerrar"],
    ["Clic derecho en el fondo", "Fondo, tema y configuración"],
    ["Escape", "Cierra el panel abierto"],
];

export function VistaAtajos() {
    return (
        <dl className="es-atajos">
            {ATAJOS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
    );
}
