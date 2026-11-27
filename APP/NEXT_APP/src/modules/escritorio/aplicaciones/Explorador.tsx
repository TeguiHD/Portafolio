"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, ExternalLink, LayoutGrid, List, PanelRight, Search } from "lucide-react";
import { IconoDe } from "../iconos/Icono";
import { aplanar, buscarNodo, migas, padre, type Apertura, type Nodo } from "./vfs";

const normal = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * El Explorador de archivos, como el de Windows 11: atrás, adelante y subir; la dirección con sus carpetas; buscar dentro
 * de la carpeta; el panel de navegación; vista de íconos o de detalles; el panel de detalles con la vista previa; y la
 * barra de estado. Las carpetas son los proyectos, servicios, herramientas y documentos reales del sitio.
 */
export function Explorador({ raiz, inicial, alAbrir }: { raiz: Nodo; inicial: string; alAbrir(a: Apertura): void }) {
    const [ruta, setRuta] = useState(buscarNodo(raiz, inicial) ? inicial : "");
    const [atras, setAtras] = useState<string[]>([]), [adelante, setAdelante] = useState<string[]>([]);
    const [vista, setVista] = useState<"iconos" | "detalles">("iconos");
    const [detalles, setDetalles] = useState(true);
    const [sel, setSel] = useState<string | null>(null);
    const [buscar, setBuscar] = useState("");
    const lista = useRef<HTMLDivElement>(null);

    // Abrir de nuevo el mismo acceso (p. ej. «Proyectos» desde el escritorio) lleva a su carpeta.
    useEffect(() => { if (buscarNodo(raiz, inicial)) { setRuta(inicial); setSel(null); setBuscar(""); } }, [inicial, raiz]);

    const carpeta = buscarNodo(raiz, ruta) ?? raiz;
    const items = useMemo(() => {
        const q = normal(buscar.trim());
        return q ? aplanar(carpeta).filter((n) => normal(`${n.nombre} ${n.descripcion ?? ""}`).includes(q)) : (carpeta.hijos ?? []);
    }, [carpeta, buscar]);
    const elegido = items.find((n) => n.ruta === sel) ?? null;

    const ir = (r: string) => {
        if (r === ruta) return;
        setAtras((a) => [...a, ruta]); setAdelante([]); setRuta(r); setSel(null); setBuscar("");
        requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>("[data-item]")?.focus({ preventScroll: true }));
    };
    const volver = () => { const r = atras.at(-1); if (r === undefined) return; setAtras((a) => a.slice(0, -1)); setAdelante((d) => [ruta, ...d]); setRuta(r); setSel(null); };
    const avanzar = () => { const r = adelante[0]; if (r === undefined) return; setAdelante((d) => d.slice(1)); setAtras((a) => [...a, ruta]); setRuta(r); setSel(null); };
    const subir = () => { const p = padre(ruta); if (p !== null) ir(p); };
    const abrir = (n: Nodo) => { if (n.tipo === "carpeta") ir(n.ruta); else if (n.abrir) alAbrir(n.abrir); };

    const alTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); volver(); return; }
        if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); avanzar(); return; }
        if ((e.altKey && e.key === "ArrowUp") || (e.key === "Backspace" && !(e.target as Element).matches("input"))) { e.preventDefault(); subir(); return; }
        const nodos = [...(lista.current?.querySelectorAll<HTMLElement>("[data-item]") ?? [])];
        const i = nodos.indexOf(document.activeElement as HTMLElement);
        if (i < 0) return;
        if (e.key === "Enter") { e.preventDefault(); abrir(items[i]); return; }
        const columnas = vista === "detalles" ? 1 : Math.max(1, Math.floor((lista.current?.clientWidth ?? 600) / 118));
        const d = ({ ArrowRight: vista === "detalles" ? 0 : 1, ArrowLeft: vista === "detalles" ? 0 : -1, ArrowDown: columnas, ArrowUp: -columnas } as Record<string, number>)[e.key];
        if (!d) return;
        e.preventDefault();
        const j = Math.max(0, Math.min(nodos.length - 1, i + d));
        nodos[j].focus(); setSel(items[j].ruta);
    };

    const navegacion = raiz.hijos ?? [];
    const herramientas = buscarNodo(raiz, "herramientas");
    return (
        <div className="ex" onKeyDown={alTeclado}>
            <div className="ex-barra">
                <button type="button" className="es-b" aria-label="Atrás" title="Atrás (Alt + flecha izquierda)" disabled={!atras.length} onClick={volver}><ArrowLeft size={16} aria-hidden="true" /></button>
                <button type="button" className="es-b" aria-label="Adelante" title="Adelante (Alt + flecha derecha)" disabled={!adelante.length} onClick={avanzar}><ArrowRight size={16} aria-hidden="true" /></button>
                <button type="button" className="es-b" aria-label="Subir un nivel" title="Subir un nivel (Alt + flecha arriba)" disabled={!ruta} onClick={subir}><ArrowUp size={16} aria-hidden="true" /></button>
                <nav className="ex-direccion" aria-label="Dirección">
                    {migas(raiz, ruta).map((n, i, todo) => (
                        <span key={n.ruta || "inicio"} className="ex-miga">
                            {i === 0 && <IconoDe icono={n.icono} tam={16} />}
                            <button type="button" aria-current={i === todo.length - 1 ? "location" : undefined} onClick={() => ir(n.ruta)}>{n.nombre}</button>
                            {i < todo.length - 1 && <ChevronRight size={14} aria-hidden="true" />}
                        </span>
                    ))}
                </nav>
                <label className="ex-buscar">
                    <input type="search" value={buscar} onChange={(e) => { setBuscar(e.target.value); setSel(null); }} placeholder={`Buscar en ${carpeta.nombre}`} aria-label={`Buscar en ${carpeta.nombre}`} />
                    <Search size={14} aria-hidden="true" />
                </label>
            </div>
            <div className="ex-comandos" role="toolbar" aria-label="Comandos">
                <button type="button" className="es-boton-chico" disabled={!elegido} onClick={() => elegido && abrir(elegido)}>Abrir</button>
                {elegido?.abrir && "externo" in elegido.abrir && (
                    <button type="button" className="es-boton-chico" onClick={() => elegido.abrir && alAbrir(elegido.abrir)}><ExternalLink size={14} aria-hidden="true" />Visitar</button>
                )}
                <span className="ex-sep" aria-hidden="true" />
                <div className="ex-segmento" role="group" aria-label="Vista">
                    <button type="button" aria-pressed={vista === "iconos"} onClick={() => setVista("iconos")}><LayoutGrid size={14} aria-hidden="true" />Íconos</button>
                    <button type="button" aria-pressed={vista === "detalles"} onClick={() => setVista("detalles")}><List size={14} aria-hidden="true" />Detalles</button>
                </div>
                <button type="button" className="es-boton-chico" aria-pressed={detalles} onClick={() => setDetalles((d) => !d)}><PanelRight size={14} aria-hidden="true" />Panel de detalles</button>
            </div>
            <div className="ex-cuerpo" data-detalles={detalles && elegido ? "" : undefined}>
                <nav className="ex-nav" aria-label="Carpetas">
                    <button type="button" aria-current={ruta === "" ? "page" : undefined} onClick={() => ir("")}><IconoDe icono="explorador" tam={16} />Inicio</button>
                    {navegacion.map((n) => (
                        <div key={n.ruta}>
                            <button type="button" aria-current={ruta === n.ruta ? "page" : undefined} onClick={() => ir(n.ruta)}><IconoDe icono={n.icono} tam={16} />{n.nombre}</button>
                            {n === herramientas && ruta.startsWith("herramientas") && (n.hijos ?? []).map((f) => (
                                <button key={f.ruta} type="button" className="ex-nav-sub" aria-current={ruta === f.ruta ? "page" : undefined} onClick={() => ir(f.ruta)}><IconoDe icono="carpeta" tam={16} />{f.nombre}</button>
                            ))}
                        </div>
                    ))}
                </nav>
                <div ref={lista} className="ex-lista" data-vista={vista} role="listbox" aria-label={buscar ? `Resultados en ${carpeta.nombre}` : carpeta.nombre}>
                    {vista === "detalles" && items.length > 0 && <div className="ex-cabecera" aria-hidden="true"><span>Nombre</span><span>Tipo</span><span>Descripción</span></div>}
                    {items.map((n, i) => (
                        <div key={n.ruta} role="option" data-item="" aria-selected={sel === n.ruta} tabIndex={(sel ?? items[0]?.ruta) === n.ruta || (!sel && i === 0) ? 0 : -1}
                            className="ex-item" onClick={() => setSel(n.ruta)} onDoubleClick={() => abrir(n)} onFocus={() => setSel(n.ruta)} title={n.descripcion}>
                            <span className="ex-item-ico">
                                {n.tipo === "imagen" && n.miniatura && vista === "iconos" ? <img src={n.miniatura} alt="" loading="lazy" decoding="async" /> : <IconoDe icono={n.icono} tam={vista === "iconos" ? 48 : 20} acceso={n.tipo === "enlace"} />}
                            </span>
                            <span className="ex-item-nombre">{n.nombre}</span>
                            {vista === "detalles" && <><span className="ex-item-clase">{n.clase}</span><span className="ex-item-desc">{n.descripcion}</span></>}
                        </div>
                    ))}
                    {!items.length && <p className="ex-vacio">{buscar ? `Nada coincide con «${buscar.trim()}» en ${carpeta.nombre}.` : "Esta carpeta está vacía."}</p>}
                </div>
                {detalles && elegido && (
                    <aside className="ex-detalle" aria-label={`Detalles de ${elegido.nombre}`}>
                        {elegido.miniatura ? <img src={elegido.miniatura} alt="" decoding="async" /> : <IconoDe icono={elegido.icono} tam={72} acceso={elegido.tipo === "enlace"} />}
                        <b>{elegido.nombre}</b>
                        <small>{elegido.clase}</small>
                        {elegido.descripcion && <p>{elegido.descripcion}</p>}
                        <button type="button" className="es-primario" onClick={() => abrir(elegido)}>{elegido.tipo === "carpeta" ? "Abrir la carpeta" : elegido.tipo === "enlace" ? "Visitar el sitio" : "Abrir"}</button>
                    </aside>
                )}
            </div>
            <footer className="ex-estado" aria-live="polite">
                <span>{items.length} {items.length === 1 ? "elemento" : "elementos"}</span>
                {elegido && <span>1 elemento seleccionado</span>}
            </footer>
        </div>
    );
}
