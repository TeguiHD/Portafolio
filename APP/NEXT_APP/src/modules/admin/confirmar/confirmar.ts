"use client";

/**
 * Confirmación con el diseño del panel, en lugar de `confirm()` del navegador.
 *
 *     if (!(await confirmar({ titulo: "¿Eliminar la propuesta?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;
 *
 * Crea un <dialog> modal al vuelo (foco atrapado, Escape cancela, el fondo queda inerte) y lo quita al cerrar.
 * El texto va con textContent: nunca se interpreta como HTML. Estilos en armazon.css (.ad-confirmar).
 */
export interface OpcionesConfirmar {
    titulo: string;
    detalle?: string;
    /** Texto del botón que confirma. */
    accion?: string;
    cancelar?: string;
    /** Acción destructiva: el botón va en color de alerta. */
    peligro?: boolean;
}

export function confirmar({ titulo, detalle, accion = "Confirmar", cancelar = "Cancelar", peligro = false }: OpcionesConfirmar): Promise<boolean> {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolver) => {
        const dialogo = document.createElement("dialog");
        dialogo.className = "ad-confirmar";
        const id = `ad-confirmar-${Math.random().toString(36).slice(2)}`;
        dialogo.setAttribute("aria-labelledby", `${id}-t`);

        const t = document.createElement("h2");
        t.id = `${id}-t`;
        t.textContent = titulo;
        dialogo.append(t);
        if (detalle) {
            const d = document.createElement("p");
            d.textContent = detalle;
            dialogo.setAttribute("aria-describedby", `${id}-d`);
            d.id = `${id}-d`;
            dialogo.append(d);
        }
        const fila = document.createElement("div");
        const no = document.createElement("button");
        no.type = "button";
        no.className = "ad-confirmar-no";
        no.textContent = cancelar;
        const si = document.createElement("button");
        si.type = "button";
        si.className = peligro ? "ad-confirmar-si ad-confirmar-peligro" : "ad-confirmar-si";
        si.textContent = accion;
        fila.append(no, si);
        dialogo.append(fila);

        let respuesta = false;
        no.addEventListener("click", () => dialogo.close());
        si.addEventListener("click", () => { respuesta = true; dialogo.close(); });
        // Clic en el fondo (fuera de la caja) cancela.
        dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
        dialogo.addEventListener("close", () => { dialogo.remove(); resolver(respuesta); }, { once: true });

        document.body.append(dialogo);
        dialogo.showModal();
        // En lo destructivo el foco parte en «Cancelar»: un Enter apresurado no borra nada.
        (peligro ? no : si).focus();
    });
}
