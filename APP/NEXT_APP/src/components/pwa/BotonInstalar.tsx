"use client";

import { useId, useState } from "react";
import { instalar, useInstalar } from "./instalar";

/**
 * «Instalar la app»: solo aparece cuando el navegador lo permite y la app no está instalada.
 * En iPhone no hay diálogo de instalación: el botón despliega el paso a paso. Sin nombrar a Safari: desde iOS 16.4
 * otros navegadores también ofrecen «Agregar a inicio» en Compartir.
 */
export function BotonInstalar({ className }: { className?: string }) {
    const modo = useInstalar();
    const [ayuda, setAyuda] = useState(false);
    // El botón va dos veces en la página (menú del celular y pie): un id fijo se repetía y el del pie apuntaba al del menú.
    const idAyuda = useId();
    if (!modo) return null;
    if (modo === "instalar") return <button type="button" className={className} onClick={() => void instalar()}>Instalar la app</button>;
    return (
        <>
            <button type="button" className={className} aria-expanded={ayuda} aria-controls={idAyuda} onClick={() => setAyuda((v) => !v)}>Agregar al inicio</button>
            {ayuda ? <p id={idAyuda} className="ayuda-instalar">Toca Compartir y luego «Agregar a inicio».</p> : null}
        </>
    );
}
