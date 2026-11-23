"use client";

import { useId, useRef, useState } from "react";

interface ControlRespuesta { id: string; nombre: string; grupo: "seguridad" | "basicos"; cumple: boolean; porQue: string; arreglo: string; pctIndice: number | null }
interface Respuesta { url: string; urlFinal: string; puntaje: number; percentil: number; sitiosIndice: number; controles: ControlRespuesta[] }

/**
 * El revisor: los doce controles del índice sobre el sitio que escribas, comparados con los sitios públicos medidos.
 * La revisión la hace el servidor (el navegador no puede leer las cabeceras de otro sitio).
 */
export function Revisor() {
    const id = useId();
    const [url, setUrl] = useState(""), [cargando, setCargando] = useState(false), [error, setError] = useState(""), [r, setR] = useState<Respuesta | null>(null);
    const resultado = useRef<HTMLDivElement>(null);

    async function revisar(e: React.FormEvent) {
        e.preventDefault();
        if (!url.trim() || cargando) return;
        setCargando(true); setError(""); setR(null);
        try {
            const res = await fetch("/api/indice/revisar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
            const datos = await res.json().catch(() => null);
            if (!res.ok || !datos || datos.error) { setError(datos?.error ?? "No se pudo revisar el sitio. Prueba de nuevo."); return; }
            setR(datos as Respuesta);
            requestAnimationFrame(() => resultado.current?.focus());
        } catch {
            setError("No hubo conexión. Revisa tu internet y prueba de nuevo.");
        } finally {
            setCargando(false);
        }
    }

    const fallas = r?.controles.filter((c) => !c.cumple) ?? [];
    return (
        <div className="ix-revisor">
            <form onSubmit={revisar} className="ix-revisor-form">
                <label htmlFor={id}>Dirección del sitio</label>
                <div className="ix-revisor-fila">
                    <input id={id} type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="tusitio.cl" autoComplete="url" spellCheck={false} required
                        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
                    <button type="submit" className="boton lleno" disabled={cargando}>{cargando ? "Revisando…" : "Revisar"}</button>
                </div>
                <p id={`${id}-error`} className="ix-revisor-error" role="alert">{error}</p>
            </form>

            {r && (
                <div className="ix-revisor-resultado" ref={resultado} tabIndex={-1} aria-labelledby={`${id}-total`}>
                    <p id={`${id}-total`} className="ix-revisor-total"><b>{r.puntaje}</b> de 12 controles</p>
                    <p className="ix-revisor-comparado">
                        {r.urlFinal.replace(/^https?:\/\//, "").replace(/\/$/, "")} cumple más controles que el {r.percentil} % de los {r.sitiosIndice} sitios públicos del índice.
                    </p>
                    <ul className="ix-controles">
                        {r.controles.map((c) => (
                            <li key={c.id} data-ok={c.cumple ? "si" : "no"}>
                                <span className="ix-marca" aria-hidden="true" />
                                <div>
                                    <p><b>{c.nombre}</b> <span className="ix-estado">{c.cumple ? "Cumple" : "No cumple"}</span></p>
                                    {!c.cumple && <p className="ix-arreglo">{c.porQue} {c.arreglo}</p>}
                                    {c.pctIndice !== null && <p className="ix-comparado">Lo cumple el {c.pctIndice} % de los sitios públicos.</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="ix-enlaces">
                        <a className="enlace-ir" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(r.urlFinal)}&form_factor=mobile`} target="_blank" rel="noopener noreferrer">Medir velocidad y accesibilidad en PageSpeed Insights</a>
                        {fallas.length > 0 && <a className="enlace-ir" href="/#contacto">Pedir ayuda para arreglarlo</a>}
                    </p>
                </div>
            )}
        </div>
    );
}
