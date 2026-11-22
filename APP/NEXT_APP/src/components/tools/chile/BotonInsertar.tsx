"use client";

import { useId } from "react";
import { IconoCopiar, useCopiarHerramienta } from "./comunes";
import { INCRUSTABLES } from "@/lib/chile/incrustables";
import "./chile.css";

const SITIO = "https://nicoholas.dev";

/**
 * «Insertar en tu sitio»: el código del iframe más un enlace visible de vuelta (el enlace dentro del iframe no cuenta
 * para el sitio que lo inserta; el de abajo sí). Como el generador de firmas de HubSpot.
 */
export function codigoInsertar(slug: string): string {
    const h = INCRUSTABLES[slug];
    if (!h) return "";
    return `<iframe src="${SITIO}/insertar/${slug}" title="${h.nombre}" width="100%" height="${h.alto}" style="border:0;max-width:640px" loading="lazy"></iframe>\n<p style="font-size:13px"><a href="${SITIO}/herramientas/${slug}">${h.nombre}</a> de nicoholas.dev</p>`;
}

export function BotonInsertar({ slug }: { slug: string }) {
    const id = useId();
    const { copiado, fallo, copiar } = useCopiarHerramienta(slug);
    const codigo = codigoInsertar(slug);
    if (!codigo) return null;
    return (
        <details className="cl-insertar">
            <summary>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg>
                Insertar en tu sitio
            </summary>
            <div>
                <p className="cl-nota">Pega este código en tu página (WordPress: bloque «HTML personalizado»). Es gratis y no lleva publicidad; deja el enlace de la última línea.</p>
                <label className="sr-solo" htmlFor={id}>Código para insertar</label>
                <textarea id={id} className="cl-entrada" readOnly value={codigo} onFocus={(e) => e.currentTarget.select()} />
                <div className="cl-fila-botones">
                    <button type="button" className="cl-boton" onClick={() => void copiar(codigo, "insertar")}><IconoCopiar hecho={copiado === "insertar"} />{copiado === "insertar" ? "Código copiado" : "Copiar el código"}</button>
                    <a className="cl-boton" href={`/insertar/${slug}`} target="_blank" rel="noopener">Ver cómo se ve</a>
                </div>
                <p className="cl-nota" role="status">{fallo ? "No se pudo copiar: selecciona el código y cópialo a mano." : ""}</p>
            </div>
        </details>
    );
}
