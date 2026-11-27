/** El alto de la barra de tareas: los paneles emergentes no la tapan. */
const BARRA = 48;

/**
 * Pega un panel emergente (popover) a su botón: debajo, o arriba si abajo no cabe sobre la barra de tareas (o arriba de
 * entrada, si se pide y cabe), sin salirse por los lados. `borde` dice con qué lado del botón se alinea y `corrimiento`
 * lo corre en horizontal. Cerrado, el panel no tiene tamaño: al abrirse (beforetoggle) se ubica con un ancho estimado y,
 * apenas lo tiene, ResizeObserver avisa antes de pintar y se corrige, así nunca se ve un cuadro fuera de lugar.
 * Las ventanas se ubican con transform, que el anclaje de CSS no sigue: por eso se calcula aquí. Devuelve cómo soltarlo.
 */
export function anclarPanel(panel: HTMLElement, boton: HTMLElement, { borde = "izq", corrimiento = 0, prefiere = "abajo" }: {
    borde?: "izq" | "der";
    corrimiento?: number;
    prefiere?: "abajo" | "arriba";
} = {}): () => void {
    const poner = () => {
        const r = boton.getBoundingClientRect(), ancho = panel.offsetWidth || 260, alto = panel.offsetHeight;
        const x = (borde === "der" ? r.right - ancho : r.left) + corrimiento;
        const abajo = r.bottom + 4, arriba = r.top - 4 - alto, cabeAbajo = abajo + alto <= innerHeight - BARRA - 8;
        const y = prefiere === "arriba" ? (arriba >= 8 || !cabeAbajo ? Math.max(8, arriba) : abajo) : (cabeAbajo || !alto ? abajo : Math.max(8, arriba));
        Object.assign(panel.style, { left: `${Math.max(8, Math.min(x, innerWidth - ancho - 8))}px`, top: `${y}px` });
    };
    const antes = (e: Event) => { if ((e as ToggleEvent).newState === "open") poner(); };
    const tam = new ResizeObserver(() => { try { if (panel.matches(":popover-open")) poner(); } catch { /* sin popover */ } });
    panel.addEventListener("beforetoggle", antes);
    tam.observe(panel);
    return () => { panel.removeEventListener("beforetoggle", antes); tam.disconnect(); };
}
