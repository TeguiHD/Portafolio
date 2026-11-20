"use client";

/**
 * El único pedazo interactivo de la página 404: así la página puede salir del servidor.
 * Quien llega a un enlace roto en una pestaña nueva (o escribiendo la dirección) no tiene de dónde volver: history.back()
 * no hacía nada o salía a una página en blanco. Sin página de origen, lleva al inicio.
 */
export function VolverAtras() {
    return <button type="button" className="enlace-ir" onClick={() => { if (document.referrer && history.length > 1) history.back(); else location.assign("/"); }}>Volver atrás</button>;
}
