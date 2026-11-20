"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Esqueleto } from "@/modules/esqueleto/Esqueleto";
import { useMateria } from "@/modules/materia/Materia";
import "./portal.css";

/** Le pide a la materia que escriba una palabra en su ancla (como las páginas de error). */
function Escribir({ texto }: { texto: string }) {
    const motor = useMateria();
    useEffect(() => { motor?.escribir(texto); }, [motor, texto]);
    return null;
}

/**
 * Las puertas del sitio: ingreso al portal de clientes, código de una propuesta, acceso al panel y cambio de clave.
 * El mismo lenguaje que las páginas de error: barra y pie de siempre, un título corto, el formulario sin caja
 * y la materia escribiendo una palabra al lado. `debajo` va bajo la rejilla (la lista de documentos, por ejemplo).
 */
export function PaginaAcceso({ palabra, sello, titulo, texto, children, debajo, aviso }: {
    palabra: string; sello?: ReactNode; titulo: ReactNode; texto?: ReactNode; children?: ReactNode; debajo?: ReactNode; aviso?: ReactNode;
}) {
    return (
        <Esqueleto>
            <main id="main-content" className="pa">
                {aviso}
                <section className="pa-escena" data-forma="texto" data-ancla="#ancla-texto" aria-labelledby="pa-titulo">
                    <Escribir texto={palabra} />
                    <div className="ancho pa-rejilla">
                        <div className="pa-cuerpo">
                            {sello ? <p className="pa-sello">{sello}</p> : null}
                            <h1 id="pa-titulo" data-largo={typeof titulo === "string" && titulo.length > 26 ? "" : undefined}>{titulo}</h1>
                            {texto ? <div className="pa-texto">{texto}</div> : null}
                            {children}
                        </div>
                        <div id="ancla-texto" aria-hidden="true" />
                    </div>
                    {debajo}
                </section>
            </main>
        </Esqueleto>
    );
}

/** Campo con subrayado (como el formulario de contacto). Con `clave`, lleva el botón para mostrarla. */
export function Campo({ etiqueta, clave = false, valor, alCambiar, ...resto }: {
    etiqueta: string; clave?: boolean; valor: string; alCambiar: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
    const id = useId();
    const [ver, setVer] = useState(false);
    return (
        <div className="pa-campo">
            <label htmlFor={id}>{etiqueta}</label>
            <div className="pa-linea">
                <input id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} {...resto} type={clave ? (ver ? "text" : "password") : resto.type ?? "text"} />
                {clave ? (
                    // Nombre fijo y estado en aria-pressed: con el nombre cambiando además, el lector decía «Ocultar contraseña, presionado».
                    <button type="button" className="pa-ver" onClick={() => setVer((v) => !v)} aria-label="Mostrar contraseña" aria-pressed={ver}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {ver
                                ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.1 4M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" /></>
                                : <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.6" /></>}
                        </svg>
                    </button>
                ) : null}
            </div>
        </div>
    );
}

/** Puntos que giran mientras se espera al servidor. */
export const Esperando = () => <span className="pa-espera" aria-hidden="true"><i /><i /><i /></span>;
