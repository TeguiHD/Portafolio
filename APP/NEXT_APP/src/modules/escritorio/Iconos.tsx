"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE } from "react";
import type { App } from "./apps";
import { IconoDe } from "./iconos/Icono";
import { CLAVE_POSICIONES, leerPosiciones, ubicar, type Pos } from "./posiciones";

export type TamIconos = "grandes" | "medianos" | "pequenos";
/** Celda (ancho, alto) e ícono (px) de cada tamaño, como «Ver» en el escritorio de Windows. */
const MEDIDAS: Record<TamIconos, { cw: number; ch: number; ic: number }> = {
    grandes: { cw: 116, ch: 124, ic: 64 }, medianos: { cw: 98, ch: 102, ic: 48 }, pequenos: { cw: 88, ch: 80, ic: 32 },
};
const MARGEN = 6;

/**
 * Los íconos del escritorio: en columnas desde arriba a la izquierda; un clic selecciona (con Ctrl suma, con Mayús un
 * tramo) y un rectángulo arrastrado sobre el fondo selecciona varios; doble clic o Enter abre; se arrastran a otra celda
 * (si está ocupada, cambian de lugar) y quedan guardados. Las flechas recorren la grilla. En el celular un toque abre.
 */
export function Iconos({ ids, resolver, accesos, tam, celular, ordenar, alAbrir, alMenu }: {
    ids: string[];
    resolver(id: string): App | null;
    accesos: Set<string>;
    tam: TamIconos;
    celular: boolean;
    ordenar: number;
    alAbrir(id: string): void;
    alMenu(id: string | null, x: number, y: number): void;
}) {
    const caja = useRef<HTMLDivElement>(null), rect = useRef<HTMLDivElement>(null);
    const [filas, setFilas] = useState(8);
    const [columnas, setColumnas] = useState(12);
    // Lo guardado se lee después de hidratar; mientras, las posiciones de fábrica (las mismas en el servidor y en el cliente).
    const [guardadas, setGuardadas] = useState<Record<string, Pos>>({});
    const pos = useMemo(() => ubicar(ids, guardadas, filas, columnas), [ids, guardadas, filas, columnas]);
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [foco, setFoco] = useState<string | null>(null);
    const ancla = useRef<string | null>(null), tactil = useRef(false);
    const { cw, ch, ic } = MEDIDAS[tam];

    // Cuántas filas y columnas caben: cambia con el tamaño de la pantalla y de los íconos.
    useLayoutEffect(() => {
        const medir = () => {
            setFilas(Math.max(1, Math.floor(((caja.current?.clientHeight ?? 600) - MARGEN * 2) / ch)));
            setColumnas(Math.max(1, Math.floor(((caja.current?.clientWidth ?? 1000) - MARGEN * 2) / cw)));
        };
        medir();
        const o = new ResizeObserver(medir);
        if (caja.current) o.observe(caja.current);
        return () => o.disconnect();
    }, [ch, cw]);
    useEffect(() => { setGuardadas(leerPosiciones(ids)); }, [ids]);
    // «Ordenar los íconos» vuelve al orden de fábrica.
    useEffect(() => {
        if (!ordenar) return;
        try { localStorage.removeItem(CLAVE_POSICIONES); } catch { /* sin almacenamiento */ }
        setGuardadas({});
    }, [ordenar]);
    const guardar = (p: Record<string, Pos>) => { setGuardadas(p); try { localStorage.setItem(CLAVE_POSICIONES, JSON.stringify(p)); } catch { /* vale para esta visita */ } };

    const enOrden = useCallback(() => [...ids].sort((a, b) => (pos[a]?.[0] ?? 0) - (pos[b]?.[0] ?? 0) || (pos[a]?.[1] ?? 0) - (pos[b]?.[1] ?? 0)), [ids, pos]);
    const enfocar = (id: string) => { setFoco(id); requestAnimationFrame(() => caja.current?.querySelector<HTMLElement>(`[data-icono="${CSS.escape(id)}"]`)?.focus({ preventScroll: true })); };

    const elegir = (id: string, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
        setFoco(id);
        if (e.shiftKey && ancla.current) {
            const orden = enOrden(), a = orden.indexOf(ancla.current), b = orden.indexOf(id);
            setSel(new Set(orden.slice(Math.min(a, b), Math.max(a, b) + 1)));
            return;
        }
        ancla.current = id;
        if (e.ctrlKey || e.metaKey) setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
        else setSel(new Set([id]));
    };

    /* Arrastrar uno o varios íconos a otra celda. */
    const alPresionarIcono = (id: string) => (e: PE<HTMLDivElement>) => {
        tactil.current = e.pointerType !== "mouse";
        if (e.button === 2) { if (!sel.has(id)) { setSel(new Set([id])); ancla.current = id; } setFoco(id); return; }
        if (e.button !== 0 || celular) return;
        e.stopPropagation();
        const el = e.currentTarget, x0 = e.clientX, y0 = e.clientY;
        const grupo = sel.has(id) && !(e.ctrlKey || e.metaKey || e.shiftKey) ? [...sel] : [id];
        let movido = false;
        el.setPointerCapture(e.pointerId);
        const nodos = () => grupo.map((g) => caja.current?.querySelector<HTMLElement>(`[data-icono="${CSS.escape(g)}"]`)).filter((n): n is HTMLElement => !!n);
        const mover = (ev: PointerEvent) => {
            const dx = ev.clientX - x0, dy = ev.clientY - y0;
            if (!movido && Math.hypot(dx, dy) < 5) return;
            movido = true;
            for (const n of nodos()) { n.style.translate = `${dx}px ${dy}px`; n.dataset.arrastre = ""; }
        };
        const fin = (ev: PointerEvent) => {
            el.removeEventListener("pointermove", mover); el.removeEventListener("lostpointercapture", fin); el.removeEventListener("pointerup", fin);
            for (const n of nodos()) { n.style.translate = ""; delete n.dataset.arrastre; }
            if (!movido) return;
            const dc = Math.round((ev.clientX - x0) / cw), dr = Math.round((ev.clientY - y0) / ch);
            if (!dc && !dr) return;
            const p = { ...pos }, ocupada = (c: number, r: number) => Object.entries(p).find(([k, v]) => !grupo.includes(k) && v[0] === c && v[1] === r)?.[0];
            for (const g of grupo) {
                const [c, r] = p[g] ?? [0, 0], nc = Math.min(columnas - 1, Math.max(0, c + dc)), nr = Math.min(filas - 1, Math.max(0, r + dr));
                const otro = ocupada(nc, nr);
                if (otro) p[otro] = [c, r]; // si está ocupada, cambian de lugar
                p[g] = [nc, nr];
            }
            guardar(p);
        };
        el.addEventListener("pointermove", mover); el.addEventListener("lostpointercapture", fin); el.addEventListener("pointerup", fin);
    };

    /* Rectángulo de selección sobre el fondo. */
    const alPresionarFondo = (e: PE<HTMLDivElement>) => {
        if (e.target !== e.currentTarget || e.button !== 0 || celular) return;
        if (!(e.ctrlKey || e.metaKey)) setSel(new Set());
        const c = e.currentTarget, base = c.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, r = rect.current;
        const previa = e.ctrlKey || e.metaKey ? new Set(sel) : new Set<string>();
        c.setPointerCapture(e.pointerId);
        const mover = (ev: PointerEvent) => {
            const x = Math.min(x0, ev.clientX), y = Math.min(y0, ev.clientY), w = Math.abs(ev.clientX - x0), h = Math.abs(ev.clientY - y0);
            if (!r || (w < 3 && h < 3)) return;
            Object.assign(r.style, { left: `${x - base.left}px`, top: `${y - base.top}px`, width: `${w}px`, height: `${h}px` });
            r.hidden = false;
            const dentro = new Set(previa);
            for (const id of ids) {
                const p = pos[id]; if (!p) continue;
                const ix = base.left + MARGEN + p[0] * cw, iy = base.top + MARGEN + p[1] * ch;
                if (ix < x + w && ix + cw > x && iy < y + h && iy + ch > y) dentro.add(id);
            }
            setSel(dentro);
        };
        const fin = () => { c.removeEventListener("pointermove", mover); c.removeEventListener("lostpointercapture", fin); if (r) r.hidden = true; };
        c.addEventListener("pointermove", mover); c.addEventListener("lostpointercapture", fin);
    };

    const alTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
        const actual = foco ?? enOrden()[0];
        if (!actual) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); setSel(new Set(ids)); return; }
        if (e.key === "Enter") { e.preventDefault(); alAbrir(actual); return; }
        if (e.key === " ") { e.preventDefault(); elegir(actual, { ctrlKey: e.ctrlKey || e.metaKey, metaKey: false, shiftKey: false }); return; }
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const b = caja.current?.querySelector<HTMLElement>(`[data-icono="${CSS.escape(actual)}"]`)?.getBoundingClientRect();
            if (!sel.has(actual)) setSel(new Set([actual]));
            alMenu(actual, b ? b.left + b.width / 2 : 40, b ? b.top + b.height / 2 : 40);
            return;
        }
        const d = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, Pos>)[e.key];
        if (!d) return;
        e.preventDefault();
        const [c, r] = pos[actual] ?? [0, 0];
        // El vecino más cercano en esa dirección (en la misma columna o fila primero).
        const candidatos = ids.filter((id) => id !== actual && pos[id]).map((id) => {
            const [c2, r2] = pos[id], dc = c2 - c, dr = r2 - r;
            const adelante = d[0] ? Math.sign(dc) === d[0] : Math.sign(dr) === d[1];
            return { id, adelante, costo: d[0] ? Math.abs(dc) * 10 + Math.abs(dr) : Math.abs(dr) * 10 + Math.abs(dc) };
        }).filter((x) => x.adelante).sort((a, b) => a.costo - b.costo);
        const siguiente = candidatos[0]?.id;
        if (!siguiente) return;
        enfocar(siguiente);
        if (e.shiftKey) setSel((s) => new Set([...s, siguiente])); else { setSel(new Set([siguiente])); ancla.current = siguiente; }
    };

    return (
        <div ref={caja} className="es-iconos" role="listbox" aria-label="Íconos del escritorio" aria-multiselectable="true" data-tam={tam}
            onPointerDown={alPresionarFondo} onKeyDown={alTeclado} style={{ "--cw": `${cw}px`, "--ch": `${ch}px` } as CSSProperties}>
            {ids.map((id) => {
                const a = resolver(id);
                if (!a) return null;
                const p = pos[id] ?? [0, 0];
                return (
                    <div key={id} role="option" aria-selected={sel.has(id)} data-icono={id} className="es-icono-escritorio"
                        tabIndex={(foco ?? enOrden()[0]) === id ? 0 : -1} title={a.descripcion}
                        style={celular ? undefined : { left: `${MARGEN + p[0] * cw}px`, top: `${MARGEN + p[1] * ch}px` }}
                        onPointerDown={alPresionarIcono(id)}
                        onClick={(e) => { if (celular || tactil.current) { alAbrir(id); return; } elegir(id, e); }}
                        onDoubleClick={() => { if (!celular && !tactil.current) alAbrir(id); }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onPointerUp={(e) => { if (e.button === 2) alMenu(id, e.clientX, e.clientY); }}>
                        <IconoDe icono={a.icono} tam={celular ? 56 : ic} acceso={accesos.has(id)} />
                        <span>{a.titulo}</span>
                    </div>
                );
            })}
            <div ref={rect} className="es-seleccion" hidden aria-hidden="true" />
        </div>
    );
}
