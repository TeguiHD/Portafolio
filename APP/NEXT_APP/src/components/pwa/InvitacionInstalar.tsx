"use client";

import { useEffect, useId, useRef, useState } from "react";
import { instalar, useInstalar } from "./instalar";

const CLAVE = "instalar-descartada";
const PAUSA = 30 * 24 * 60 * 60 * 1000;

function descartadaHacePoco(): boolean {
    try { const t = Number(localStorage.getItem(CLAVE)); return t > 0 && Date.now() - t < PAUSA; } catch { return false; }
}
function descartar() {
    try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* sin almacenamiento: vuelve en la próxima visita */ }
}

/**
 * Invitación a instalar la app en el celular. No es un modal ni sale al cargar: aparece abajo cuando el visitante ya bajó
 * por la página, deja usar todo lo demás y se cierra con «Ahora no» (no vuelve en 30 días). En el computador no aparece:
 * ahí el navegador ya muestra su ícono de instalar, y el pie tiene el botón.
 */
export function InvitacionInstalar() {
    const modo = useInstalar();
    const [bajo, setBajo] = useState(false), [cerrada, setCerrada] = useState(false);
    const caja = useRef<HTMLElement>(null), id = useId();
    const ver = Boolean(modo) && bajo && !cerrada;

    useEffect(() => {
        if (!modo || bajo || !matchMedia("(pointer: coarse)").matches || descartadaHacePoco()) return;
        const alBajar = () => { if (scrollY > innerHeight * 0.8) setBajo(true); };
        addEventListener("scroll", alBajar, { passive: true });
        alBajar();
        return () => removeEventListener("scroll", alBajar);
    }, [modo, bajo]);

    // Popover manual en una <section>, no un <dialog>: queda encima de todo sin bloquear la página y, a diferencia de un
    // diálogo, no se lleva el foco (aparece mientras la persona lee). Sin popover (iOS antes de 18.3) se ve igual como
    // barra fija: el CSS la muestra con [data-sin-popover].
    useEffect(() => {
        const d = caja.current;
        if (!ver || !d) return;
        try { if (!d.matches(":popover-open")) d.showPopover(); } catch { d.dataset.sinPopover = ""; }
    }, [ver]);

    if (!ver) return null;
    const cerrar = () => { descartar(); setCerrada(true); };
    const ios = modo === "ios";
    return (
        <section ref={caja} className="invitar" popover="manual" aria-labelledby={`${id}t`} aria-describedby={`${id}d`}>
            <img src="/icon-192.png?v=5" alt="" width={36} height={36} />
            <p className="invitar-texto">
                <strong id={`${id}t`}>{ios ? "Agrega nicoholas.dev a tu inicio" : "Instala nicoholas.dev"}</strong>
                <span id={`${id}d`}>{ios ? "Toca Compartir y luego «Agregar a inicio»." : "Ábrela desde tu inicio, como una app."}</span>
            </p>
            <div className="invitar-botones">
                {ios ? <button type="button" className="lleno" onClick={cerrar}>Entendido</button> : <>
                    <button type="button" onClick={cerrar}>Ahora no</button>
                    {/* Si cancela el diálogo del navegador, tampoco se insiste: cuenta como «Ahora no». */}
                    <button type="button" className="lleno" onClick={() => { descartar(); setCerrada(true); void instalar(); }}>Instalar</button>
                </>}
            </div>
        </section>
    );
}
