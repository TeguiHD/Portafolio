"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useMateria } from "@/modules/materia/Materia";

/** La materia escribe la cifra principal del índice (la sección declara data-forma="texto" data-ancla="#ix-texto"). */
export function TextoMateria({ texto }: { texto: string }) {
    const motor = useMateria();
    useEffect(() => { motor?.escribir(texto); }, [motor, texto]);
    return <div id="ix-texto" className="ix-texto" aria-hidden="true" />;
}

export interface Entrada { slug: string; nombre: string; ruta: string; categoria: string; nota: number | null }

/** Quita tildes y mayúsculas para comparar («Ñuñoa» lo encuentra «nunoa»). */
const plano = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Busca una institución por nombre o comuna. Muestra hasta ocho resultados; Enter abre el primero. */
export function Buscador({ entradas }: { entradas: Entrada[] }) {
    const [q, setQ] = useState("");
    const id = useId();
    const resultados = useMemo(() => {
        const t = plano(q.trim());
        if (t.length < 2) return [];
        return entradas.filter((e) => plano(e.nombre).includes(t)).slice(0, 8);
    }, [q, entradas]);
    const lista = useRef<HTMLUListElement>(null);
    return (
        <form className="ix-buscador" role="search" onSubmit={(e) => { e.preventDefault(); lista.current?.querySelector<HTMLAnchorElement>("a")?.click(); }}>
            <label htmlFor={id}>Busca tu municipalidad, ministerio, gobierno regional o universidad</label>
            <div className="ix-campo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Por ejemplo: Valparaíso" autoComplete="off" spellCheck={false} />
            </div>
            <p className="ix-buscador-estado" role="status">{q.trim().length >= 2 ? (resultados.length ? `${resultados.length === 8 ? "Los primeros 8" : resultados.length} resultado${resultados.length === 1 ? "" : "s"}` : "Sin resultados. Prueba con otra parte del nombre.") : ""}</p>
            {resultados.length > 0 && (
                <ul className="ix-resultados" ref={lista}>
                    {resultados.map((r) => (
                        <li key={r.slug}>
                            <Link href={r.ruta}><span>{r.nombre}</span><small>{r.categoria}</small><b>{r.nota ?? "Sin respuesta"}</b></Link>
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
}

/** Filtra las filas de una tabla del ranking por nombre o región (la tabla entera viene del servidor). */
export function FiltroTabla({ tabla, total }: { tabla: string; total: number }) {
    const [q, setQ] = useState(""), [n, setN] = useState(total);
    const id = useId();
    useEffect(() => {
        const t = plano(q.trim());
        const filas = document.querySelectorAll<HTMLTableRowElement>(`#${tabla} tbody tr`);
        let visibles = 0;
        filas.forEach((f) => { const ok = !t || plano(f.dataset.buscar ?? "").includes(t); f.hidden = !ok; if (ok) visibles++; });
        setN(visibles);
    }, [q, tabla]);
    return (
        <div className="ix-filtro">
            <label htmlFor={id}>Filtrar por nombre o región</label>
            <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
            <p role="status">{q.trim() ? `${n} de ${total}` : ""}</p>
        </div>
    );
}

/** Copia la cita del estudio. */
export function Copiar({ texto, etiqueta = "Copiar la cita" }: { texto: string; etiqueta?: string }) {
    const [hecho, setHecho] = useState(false);
    return (
        <button type="button" className="boton linea chico" onClick={async () => {
            try { await navigator.clipboard.writeText(texto); setHecho(true); setTimeout(() => setHecho(false), 2200); } catch { /* sin permiso: el texto sigue a la vista para copiarlo a mano */ }
        }}>{hecho ? "Copiada" : etiqueta}</button>
    );
}

/**
 * Ordena el ranking por la columna que se elija (patrón sortable-table): botones en los encabezados con un comando
 * propio (--ordenar), aria-sort en el encabezado activo, las filas existentes se mueven (no se vuelven a dibujar) y un
 * solo aviso por cada orden. Sin invocadores (navegadores viejos), el mismo orden con un clic.
 */
export function OrdenTabla({ tabla }: { tabla: string }) {
    const estado = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        const t = document.getElementById(tabla) as HTMLTableElement | null;
        const cuerpo = t?.tBodies[0], cabeza = t?.tHead?.rows[0];
        if (!t || !cuerpo || !cabeza) return;
        const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
        const ordenar = (b: HTMLButtonElement) => {
            const th = b.closest("th")!;
            const dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
            for (const h of cabeza.cells) h.removeAttribute("aria-sort");
            th.setAttribute("aria-sort", dir);
            const i = th.cellIndex, numero = th.dataset.type === "number", f = dir === "ascending" ? 1 : -1;
            const filas = [...cuerpo.rows].map((r) => ({ r, v: r.cells[i]?.dataset.value ?? r.cells[i]?.textContent?.trim() ?? "" }));
            filas.sort((a, b) => f * (numero ? Number(a.v) - Number(b.v) : collator.compare(a.v, b.v)));
            const mover = cuerpo as HTMLTableSectionElement & { moveBefore?: (n: Node, ref: Node | null) => void };
            for (const { r } of filas) { if (mover.moveBefore) mover.moveBefore(r, null); else cuerpo.appendChild(r); }
            if (estado.current) estado.current.textContent = `Ordenado por ${b.textContent?.trim()}, ${dir === "ascending" ? "de menor a mayor" : "de mayor a menor"}.`;
        };
        const alComando = (e: Event) => {
            const ev = e as Event & { command?: string; source?: Element | null };
            if (ev.command === "--ordenar" && ev.source instanceof HTMLButtonElement) ordenar(ev.source);
        };
        t.addEventListener("command", alComando);
        // Solo sin invocadores: con ellos, un clic también dispara «command» y ordenaría dos veces.
        const sinInvocador = !("commandForElement" in HTMLButtonElement.prototype);
        const clics = sinInvocador ? [...cabeza.querySelectorAll<HTMLButtonElement>('button[command="--ordenar"]')].map((b) => { const fn = () => ordenar(b); b.addEventListener("click", fn); return () => b.removeEventListener("click", fn); }) : [];
        return () => { t.removeEventListener("command", alComando); clics.forEach((quitar) => quitar()); };
    }, [tabla]);
    return <p ref={estado} className="ix-oculto" role="status" />;
}
