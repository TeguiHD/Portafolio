"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE } from "react";
import type { App } from "./apps";
import { RESERVA_CAPSULA } from "./geometria";
import { Glifo } from "./Glifo";

const CELDA_W = 104, CELDA_H = 110, MARGEN_X = 14, MARGEN_Y = 16;
const CLAVE = "escritorio:iconos";
type Celda = [number, number];

/** Ubica cada ícono en su celda guardada (si sigue cabiendo y está libre) y el resto, por columnas, en las libres. */
function ubicar(ids: string[], guardadas: Record<string, Celda>, filas: number, columnas: number): Map<string, Celda> {
    const pos = new Map<string, Celda>(), ocupadas = new Set<string>();
    for (const id of ids) {
        const g = guardadas[id];
        if (g && g[0] >= 0 && g[0] < columnas && g[1] >= 0 && g[1] < filas && !ocupadas.has(`${g[0]},${g[1]}`)) { pos.set(id, g); ocupadas.add(`${g[0]},${g[1]}`); }
    }
    let c = 0, f = 0;
    for (const id of ids) {
        if (pos.has(id)) continue;
        while (ocupadas.has(`${c},${f}`)) { f++; if (f >= filas) { f = 0; c++; } }
        pos.set(id, [c, f]); ocupadas.add(`${c},${f}`);
    }
    return pos;
}

/**
 * Los íconos del escritorio: un clic los elige, doble clic (o Enter) los abre y se pueden arrastrar a otra celda de la
 * cuadrícula, donde quedan guardados. En el celular son una grilla fija y un toque abre.
 */
export function Iconos({ ids, resolver, celular, alAbrir, ordenar }: {
    ids: string[]; resolver: (id: string) => App | null; celular: boolean; alAbrir: (id: string) => void; ordenar: number;
}) {
    const [guardadas, setGuardadas] = useState<Record<string, Celda>>({});
    const [medida, setMedida] = useState({ filas: 6, columnas: 8 });
    const [elegido, setElegido] = useState<string | null>(null);
    const [foco, setFoco] = useState(ids[0]);
    const arrastrado = useRef(false);
    const lista = useRef<HTMLUListElement>(null);

    useEffect(() => {
        try { const g = JSON.parse(localStorage.getItem(CLAVE) ?? "{}"); if (g && typeof g === "object") setGuardadas(g as Record<string, Celda>); } catch { /* de fábrica */ }
        const medir = () => setMedida({
            filas: Math.max(1, Math.floor((innerHeight - MARGEN_Y - RESERVA_CAPSULA) / CELDA_H)),
            columnas: Math.max(1, Math.floor((innerWidth - MARGEN_X) / CELDA_W)),
        });
        medir();
        addEventListener("resize", medir);
        // Un clic fuera de los íconos deja de elegir el que estaba elegido.
        const fuera = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.(".es-icono")) setElegido(null); };
        document.addEventListener("pointerdown", fuera);
        return () => { removeEventListener("resize", medir); document.removeEventListener("pointerdown", fuera); };
    }, []);

    // «Ordenar los íconos» (menú del escritorio): vuelven a su orden de fábrica.
    useEffect(() => {
        if (!ordenar) return;
        setGuardadas({});
        try { localStorage.removeItem(CLAVE); } catch { /* nada guardado */ }
    }, [ordenar]);

    const pos = useMemo(() => ubicar(ids, guardadas, medida.filas, medida.columnas), [ids, guardadas, medida]);
    const enOrden = useMemo(() => [...ids].sort((a, b) => { const pa = pos.get(a)!, pb = pos.get(b)!; return pa[0] - pb[0] || pa[1] - pb[1]; }), [ids, pos]);

    const guardar = (nuevas: Record<string, Celda>) => {
        setGuardadas(nuevas);
        try { localStorage.setItem(CLAVE, JSON.stringify(nuevas)); } catch { /* vale para esta visita */ }
    };

    const presionar = (id: string) => (e: PE<HTMLLIElement>) => {
        setElegido(id); setFoco(id);
        arrastrado.current = false;
        if (celular || e.button !== 0 || e.pointerType === "touch") return;
        const li = e.currentTarget, x0 = e.clientX, y0 = e.clientY;
        li.setPointerCapture(e.pointerId);
        let dx = 0, dy = 0;
        const mover = (ev: PointerEvent) => {
            dx = ev.clientX - x0; dy = ev.clientY - y0;
            if (!arrastrado.current && Math.hypot(dx, dy) < 5) return;
            arrastrado.current = true;
            li.classList.add("es-icono-arrastre");
            li.style.translate = `${dx}px ${dy}px`;
        };
        const fin = () => {
            li.removeEventListener("pointermove", mover);
            li.removeEventListener("lostpointercapture", fin);
            li.classList.remove("es-icono-arrastre");
            li.style.translate = "";
            if (!arrastrado.current) return;
            const [c0, f0] = pos.get(id)!;
            const c = Math.min(medida.columnas - 1, Math.max(0, Math.round(c0 + dx / CELDA_W)));
            const f = Math.min(medida.filas - 1, Math.max(0, Math.round(f0 + dy / CELDA_H)));
            if (c === c0 && f === f0) return;
            const nuevas: Record<string, Celda> = Object.fromEntries(ids.map((i) => [i, pos.get(i)!]));
            const otro = ids.find((i) => i !== id && nuevas[i][0] === c && nuevas[i][1] === f);
            if (otro) nuevas[otro] = [c0, f0];
            nuevas[id] = [c, f];
            guardar(nuevas);
        };
        li.addEventListener("pointermove", mover);
        li.addEventListener("lostpointercapture", fin);
    };

    const teclas = (id: string) => (e: KeyboardEvent<HTMLLIElement>) => {
        if (e.key === "Enter") { e.preventDefault(); alAbrir(id); return; }
        const paso = { ArrowDown: 1, ArrowRight: medida.filas, ArrowUp: -1, ArrowLeft: -medida.filas }[e.key];
        if (!paso) return;
        e.preventDefault();
        const i = enOrden.indexOf(id), j = Math.min(enOrden.length - 1, Math.max(0, i + (celular ? Math.sign(paso) : paso)));
        const otro = enOrden[j];
        setFoco(otro); setElegido(otro);
        lista.current?.querySelector<HTMLElement>(`[data-icono="${otro}"]`)?.focus();
    };

    return (
        <ul ref={lista} className="es-iconos" role="listbox" aria-label="Íconos del escritorio" aria-orientation="vertical">
            {enOrden.map((id) => {
                const a = resolver(id);
                if (!a) return null;
                const [c, f] = pos.get(id)!;
                const estilo = { "--c": a.color, ...(celular ? {} : { left: `${MARGEN_X + c * CELDA_W}px`, top: `${MARGEN_Y + f * CELDA_H}px` }) } as CSSProperties;
                return (
                    <li key={id} role="option" className="es-icono" data-icono={id} aria-selected={elegido === id} tabIndex={foco === id ? 0 : -1} style={estilo}
                        onPointerDown={presionar(id)} onDoubleClick={() => { if (!arrastrado.current && !celular) alAbrir(id); }}
                        onClick={(e) => { if (celular || (e.nativeEvent as PointerEvent).pointerType === "touch") alAbrir(id); }}
                        onKeyDown={teclas(id)}>
                        <span className="es-icono-glifo"><Glifo d={a.glifo} /></span>
                        <span className="es-icono-nombre">{a.titulo}</span>
                    </li>
                );
            })}
        </ul>
    );
}
