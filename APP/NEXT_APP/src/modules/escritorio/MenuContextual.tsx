"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { navegarMenu } from "./menu";

export interface Opcion { texto: string; icono?: ReactNode; accion(): void; marcada?: boolean; grupo?: string; deshabilitada?: boolean }
export interface PedidoMenu { x: number; y: number; titulo: string; opciones: (Opcion | "separador")[] }

/**
 * El menú contextual de Windows 11 (clic derecho en el fondo, en un ícono o en un botón de la barra de tareas). Se abre
 * donde se soltó el botón derecho, sin salirse de la pantalla, y se recorre con las flechas.
 */
export function MenuContextual({ pedido, alCerrar }: { pedido: PedidoMenu | null; alCerrar(): void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const m = ref.current;
        if (!m || !pedido) return;
        m.style.left = "0px"; m.style.top = "0px";
        try { m.showPopover(); } catch { return; }
        const { width, height } = m.getBoundingClientRect();
        m.style.left = `${Math.max(4, Math.min(pedido.x, innerWidth - width - 4))}px`;
        m.style.top = `${Math.max(4, pedido.y + height > innerHeight - 52 ? pedido.y - height : pedido.y)}px`;
        m.querySelector<HTMLElement>("[role^=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
        const alCambiar = (e: Event) => { if ((e as ToggleEvent).newState === "closed") alCerrar(); };
        m.addEventListener("toggle", alCambiar);
        return () => m.removeEventListener("toggle", alCambiar);
    }, [pedido, alCerrar]);
    if (!pedido) return null;
    const elegir = (o: Opcion) => () => { try { ref.current?.hidePopover(); } catch { /* ya cerrado */ } o.accion(); };
    return (
        <div ref={ref} popover="auto" role="menu" aria-label={pedido.titulo} className="es-flota es-menu es-contextual" onKeyDown={navegarMenu}>
            {pedido.opciones.map((o, i) => o === "separador" ? <hr key={i} /> : (
                <button key={i} type="button" role={o.grupo ? "menuitemradio" : "menuitem"} aria-checked={o.grupo ? !!o.marcada : undefined}
                    disabled={o.deshabilitada} onClick={elegir(o)}>
                    <span className="es-menu-ico" aria-hidden="true">{o.grupo ? (o.marcada ? <Check size={14} /> : null) : o.icono}</span>{o.texto}
                </button>
            ))}
        </div>
    );
}
