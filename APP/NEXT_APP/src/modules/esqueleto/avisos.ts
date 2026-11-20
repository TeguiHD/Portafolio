const SVG = "http://www.w3.org/2000/svg";
/** Lo que espera la caja recién abierta antes de recibir el texto (ms). Ver abajo. */
const ESPERA_VOZ = 120;

/**
 * Un aviso breve al pie de la pantalla («Correo copiado», «Mensaje enviado»). Se va solo.
 * La caja `.avisos` la pone `Esqueleto`; es un popover manual para quedar por encima de todo.
 * Con `ok = false` el aviso va sin el visto bueno: es para decir que algo no se pudo.
 */
export function avisar(texto: string, ok = true) {
    const caja = document.querySelector<HTMLElement>(".viva > .avisos");
    if (!caja) return;
    const aviso = document.createElement("div");
    aviso.className = "aviso";
    if (ok) {
        const marca = document.createElementNS(SVG, "svg"), trazo = document.createElementNS(SVG, "path");
        for (const [k, v] of Object.entries({ width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "var(--acento)", "stroke-width": "2.4", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) marca.setAttribute(k, v);
        trazo.setAttribute("d", "m5 12.5 4.5 4.5L19 7.5");
        marca.append(trazo); aviso.append(marca);
    }
    aviso.append(texto);
    const poner = () => {
        caja.append(aviso);
        setTimeout(() => {
            aviso.classList.add("fuera");
            setTimeout(() => { aviso.remove(); if (!caja.children.length) { try { caja.hidePopover(); } catch { /* sin popover: la caja ya es fija y visible */ } } }, 320);
        }, 2800);
    };
    // La caja es la región que lee el lector de pantalla (role="status"). Una región que aparece ya con el texto dentro
    // no siempre se anuncia: por eso se abre vacía y el texto llega un instante después.
    let recienAbierta = false;
    try { if (!caja.matches(":popover-open")) { caja.showPopover(); recienAbierta = true; } } catch { /* sin popover: idem */ }
    if (recienAbierta) setTimeout(poner, ESPERA_VOZ); else poner();
}
