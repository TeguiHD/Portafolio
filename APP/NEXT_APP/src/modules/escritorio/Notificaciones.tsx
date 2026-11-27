"use client";

import { X } from "lucide-react";
import { IconoDe } from "./iconos/Icono";
import type { Aviso } from "./Flotantes";

/**
 * Las notificaciones emergentes de Windows 11: abajo a la derecha, sobre la barra de tareas, con el ícono y el nombre de
 * la app, un título y un texto. Se van solas a los 6 s (las maneja el escritorio) y quedan en el panel de la hora.
 */
export function Notificaciones({ visibles, alAbrir, alCerrar }: { visibles: Aviso[]; alAbrir(a: Aviso): void; alCerrar(id: number): void }) {
    return (
        <section className="es-toasts" aria-label="Notificaciones nuevas" aria-live="polite">
            {visibles.map((a) => (
                <div key={a.id} className="es-toast" role="status">
                    <button type="button" className="es-toast-abrir" onClick={() => alAbrir(a)}>
                        <span className="es-aviso-app"><IconoDe icono={a.app.icono} tam={16} />{a.app.titulo}</span>
                        <b>{a.titulo}</b>
                        <span>{a.texto}</span>
                    </button>
                    <button type="button" className="es-toast-cerrar" aria-label="Cerrar la notificación" onClick={() => alCerrar(a.id)}><X size={14} aria-hidden="true" /></button>
                </div>
            ))}
        </section>
    );
}
