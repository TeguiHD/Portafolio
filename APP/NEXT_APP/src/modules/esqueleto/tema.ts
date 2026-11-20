export type Tema = "oscuro" | "claro";

const CLAVE = "tema";

export function temaActual(): Tema {
    return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

/**
 * Cambia entre tema claro y oscuro y recuerda la elección.
 * Con View Transitions, el tema nuevo se abre en círculo desde el punto del clic;
 * sin la API, o si se pide menos movimiento, cambia de inmediato.
 */
export function cambiarTema(evento?: { clientX: number; clientY: number }): void {
    const raiz = document.documentElement;
    const nuevo: Tema = temaActual() === "oscuro" ? "claro" : "oscuro";
    const aplicar = () => {
        raiz.dataset.tema = nuevo;
        try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento: vale para esta visita */ }
    };
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || quieto) { aplicar(); return; }
    const x = evento?.clientX || innerWidth / 2, y = evento?.clientY || 40;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(aplicar).ready.then(() => {
        raiz.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
            { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
        );
    }).catch(() => { /* la transición se saltó: el tema ya quedó aplicado */ });
}
