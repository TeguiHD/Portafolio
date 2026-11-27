"use client";

import { useEffect, useRef, type ReactNode } from "react";

const HORA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const FECHA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long" });

/**
 * El encendido y la pantalla de bloqueo, como en Windows 11. El encendido (solo la primera visita) es la marca «n.» con
 * los puntos girando; la pantalla de bloqueo muestra la hora y la fecha de Santiago sobre el fondo y se sube con
 * cualquier tecla, un clic o deslizando hacia arriba.
 */
export function Bloqueo({ fase, ahora, fondo, alListo }: { fase: "encendido" | "bloqueo"; ahora: Date | null; fondo: ReactNode; alListo(): void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        el?.focus({ preventScroll: true });
        let hecho = false, y0: number | null = null;
        const salir = (e?: Event) => {
            if (hecho) return;
            if (e instanceof KeyboardEvent && (e.key === "Tab" || e.key === "Shift" || e.metaKey || e.ctrlKey || e.altKey)) return;
            hecho = true;
            e?.preventDefault();
            const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (!el || reducido) { alListo(); return; }
            el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0.6 }], { duration: 420, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" })
                .finished.then(alListo).catch(alListo);
        };
        const abajo = (e: PointerEvent) => { y0 = e.clientY; };
        const arriba = (e: PointerEvent) => { if (y0 === null || y0 - e.clientY > 40 || Math.abs(y0 - e.clientY) < 8) salir(e); y0 = null; };
        // Un respiro antes de escuchar: el clic que llevó a bloquear no debe desbloquear al instante.
        const t = setTimeout(() => {
            el?.addEventListener("pointerdown", abajo);
            el?.addEventListener("pointerup", arriba);
            el?.addEventListener("keydown", salir);
        }, fase === "encendido" ? 150 : 350);
        const auto = fase === "encendido" ? setTimeout(() => salir(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 1400) : 0;
        return () => {
            clearTimeout(t); clearTimeout(auto);
            el?.removeEventListener("pointerdown", abajo); el?.removeEventListener("pointerup", arriba); el?.removeEventListener("keydown", salir);
        };
    }, [fase, alListo]);

    if (fase === "encendido") {
        return (
            <div ref={ref} className="es-encendido" role="dialog" aria-modal="true" aria-label="Encendiendo el escritorio" tabIndex={-1}>
                <span className="es-marca es-marca-grande" aria-hidden="true">n<i>.</i></span>
                <span className="es-girando" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</span>
            </div>
        );
    }
    return (
        <div ref={ref} className="es-bloqueo" role="dialog" aria-modal="true" aria-label="Pantalla de bloqueo. Presiona una tecla o haz clic para entrar." tabIndex={-1}>
            {fondo}
            <div className="es-bloqueo-txt">
                <p className="es-bloqueo-hora">{ahora ? HORA.format(ahora) : ""}</p>
                <p className="es-bloqueo-fecha">{ahora ? FECHA.format(ahora).replace(/^./, (c) => c.toUpperCase()) : ""}</p>
            </div>
            <p className="es-bloqueo-pista">Haz clic, desliza hacia arriba o presiona una tecla para entrar</p>
        </div>
    );
}
