/**
 * Los íconos de las apps del modo escritorio, dibujados para el sitio (48 × 48). Siguen la idea de los íconos de objetos
 * de Windows 11 (una carpeta es una carpeta, el correo un sobre), con trazo y colores propios. Son texto fijo de este
 * archivo: nunca llevan datos de fuera. `u` es un prefijo único para los ids de los degradados de cada copia.
 */
export type IconoSistema =
    | "carpeta" | "carpeta-proyectos" | "carpeta-servicios" | "carpeta-herramientas" | "carpeta-documentos"
    | "correo" | "noticias" | "fotos" | "configuracion" | "documento" | "grafico" | "perfil" | "plano"
    | "explorador" | "escritorio" | "imagen" | "enlace" | "widgets";

const lineal = (id: string, a: string, b: string, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

/** Carpeta: el fondo con su pestaña, el frente más claro y un brillo en el borde de arriba; con emblema opcional. */
function carpeta(u: string, emblema = "", frente: [string, string] = ["#ffe18f", "#f6b93b"]): string {
    return `<defs>${lineal(`${u}a`, "#f4bf4f", "#dc9419")}${lineal(`${u}b`, frente[0], frente[1])}</defs>`
        + `<path d="M4 11.5A3.5 3.5 0 0 1 7.5 8h10.1c.9 0 1.8.4 2.4 1l2.6 2.6h17.9a3.5 3.5 0 0 1 3.5 3.5V36.5a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 36.5Z" fill="url(#${u}a)"/>`
        + `<path d="M4 18.5A3.5 3.5 0 0 1 7.5 15h33a3.5 3.5 0 0 1 3.5 3.5v18a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 36.5Z" fill="url(#${u}b)"/>`
        + `<path d="M7.5 15.6h33" stroke="#fff" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/>`
        + emblema;
}
const trazo = (d: string, color = "#b4730f") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

export const DIBUJOS: Record<IconoSistema, (u: string) => string> = {
    carpeta: (u) => carpeta(u),
    // Proyectos: capas apiladas, el trabajo hecho.
    "carpeta-proyectos": (u) => carpeta(u, trazo("M24 21.5l7.5 3.6-7.5 3.6-7.5-3.6Z M16.5 29.2l7.5 3.6 7.5-3.6")),
    // Servicios: maletín.
    "carpeta-servicios": (u) => carpeta(u, trazo("M17.5 24.5h13a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5V26a1.5 1.5 0 0 1 1.5-1.5Z M21 24.5v-1.8a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2v1.8 M16 28.6h16")),
    // Herramientas: llave.
    "carpeta-herramientas": (u) => carpeta(u, trazo("M28.6 22.2a4 4 0 0 0-5 5.2l-6 6a1.6 1.6 0 0 0 2.3 2.3l6-6a4 4 0 0 0 5.2-5l-2.4 2.4-2.2-.3-.3-2.2Z")),
    // Documentos: hoja con renglones.
    "carpeta-documentos": (u) => carpeta(u, trazo("M20 21.5h6.5l3.5 3.5v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1Z M22 29h6 M22 32h4")),
    // Explorador: la carpeta con la franja de una ventana.
    explorador: (u) => carpeta(u, `<rect x="4" y="30.5" width="40" height="9.5" rx="3.5" fill="url(#${u}c)"/><defs>${lineal(`${u}c`, "#2dd4bf", "#0f766e")}</defs><path d="M10 35.2h10" stroke="#ecfeff" stroke-width="2" stroke-linecap="round"/>`),

    // Escritorio: la pantalla con dos íconos, sobre su pie.
    escritorio: (u) => `<defs>${lineal(`${u}a`, "#5eead4", "#0e7490", 1, 1)}${lineal(`${u}b`, "#e2e8f0", "#94a3b8")}</defs>`
        + `<path d="M20.5 35h7l1.4 4.6h-9.8Z" fill="url(#${u}b)"/><rect x="14" y="39" width="20" height="3" rx="1.5" fill="url(#${u}b)"/>`
        + `<rect x="4" y="7" width="40" height="28.5" rx="4" fill="url(#${u}a)"/>`
        + `<path d="M7.6 10.6h32.8" stroke="#fff" stroke-opacity=".5" stroke-width="1.1" stroke-linecap="round"/>`
        + `<rect x="9" y="15" width="6" height="6" rx="1.5" fill="#ecfeff" fill-opacity=".9"/><rect x="9" y="24" width="6" height="6" rx="1.5" fill="#ecfeff" fill-opacity=".6"/>`,

    correo: (u) => `<defs>${lineal(`${u}a`, "#5eead4", "#0e7490", 1, 1)}${lineal(`${u}b`, "#ffffff", "#d9f7f2")}</defs>`
        + `<rect x="4" y="10" width="40" height="29" rx="5" fill="url(#${u}a)"/>`
        + `<path d="M5.5 36.5 19 24.8M42.5 36.5 29 24.8" stroke="#0b5563" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`
        + `<path d="M6.5 13.2 22 25.6a3.2 3.2 0 0 0 4 0l15.5-12.4" fill="none" stroke="url(#${u}b)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,

    noticias: (u) => `<defs>${lineal(`${u}a`, "#fb923c", "#e11d48", 1, 0)}${lineal(`${u}b`, "#93c5fd", "#6366f1", 1, 1)}</defs>`
        + `<rect x="7" y="6" width="34" height="37" rx="4" fill="#f8fafc"/><rect x="7" y="6" width="34" height="37" rx="4" fill="none" stroke="#0f172a" stroke-opacity=".12"/>`
        + `<path d="M11 6h26a4 4 0 0 1 4 4v4H7v-4a4 4 0 0 1 4-4Z" fill="url(#${u}a)"/>`
        + `<rect x="12" y="19" width="24" height="2.6" rx="1.3" fill="#334155"/>`
        + `<rect x="12" y="25" width="10" height="10" rx="1.8" fill="url(#${u}b)"/>`
        + `<rect x="25" y="25.4" width="11" height="2.2" rx="1.1" fill="#94a3b8"/><rect x="25" y="29.4" width="11" height="2.2" rx="1.1" fill="#94a3b8"/><rect x="25" y="33.4" width="7" height="2.2" rx="1.1" fill="#94a3b8"/>`
        + `<rect x="12" y="38" width="20" height="1.8" rx=".9" fill="#cbd5e1"/>`,

    fotos: (u) => `<defs>${lineal(`${u}a`, "#7dd3fc", "#c4b5fd")}${lineal(`${u}b`, "#2dd4bf", "#0f766e")}</defs>`
        + `<rect x="4" y="7" width="40" height="34" rx="6" fill="url(#${u}a)"/>`
        + `<circle cx="33" cy="17" r="4" fill="#fef3c7"/>`
        + `<path d="M4 33.5 15.5 21.5a2 2 0 0 1 2.9 0L28 31.5l4.2-4.3a2 2 0 0 1 2.9 0L44 36v-1V35a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6Z" fill="url(#${u}b)"/>`
        + `<rect x="4.5" y="7.5" width="39" height="33" rx="5.5" fill="none" stroke="#fff" stroke-opacity=".35"/>`,

    imagen: (u) => DIBUJOS.fotos(u),

    // El engranaje se agranda un poco desde su centro: de otro modo se ve más chico que los demás.
    configuracion: (u) => `<defs>${lineal(`${u}a`, "#cbd5e1", "#64748b", 1, 1)}${lineal(`${u}b`, "#5eead4", "#0f766e", 1, 1)}</defs>`
        + `<g transform="translate(24 24) scale(1.17) translate(-24 -26.7)">`
        + `<path d="M21.4 4.8h5.2l1.1 5.3a14.5 14.5 0 0 1 3.9 2.3l5.1-1.7 2.6 4.5-4 3.6a14.5 14.5 0 0 1 0 4.5l4 3.6-2.6 4.5-5.1-1.7a14.5 14.5 0 0 1-3.9 2.3l-1.1 5.3h-5.2l-1.1-5.3a14.5 14.5 0 0 1-3.9-2.3l-5.1 1.7-2.6-4.5 4-3.6a14.5 14.5 0 0 1 0-4.5l-4-3.6 2.6-4.5 5.1 1.7a14.5 14.5 0 0 1 3.9-2.3Z" transform="translate(0 4.5)" fill="url(#${u}a)"/>`
        + `<circle cx="24" cy="26.7" r="6.6" fill="url(#${u}b)"/><circle cx="24" cy="26.7" r="2.6" fill="#f0fdfa"/></g>`,

    documento: (u) => `<defs>${lineal(`${u}a`, "#ffffff", "#e2e8f0")}</defs>`
        + `<path d="M11 4h18l10 10v27a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill="url(#${u}a)" stroke="#0f172a" stroke-opacity=".14"/>`
        + `<path d="M29 4v7a3 3 0 0 0 3 3h7" fill="#cbd5e1"/>`
        + `<rect x="13" y="20" width="20" height="2.4" rx="1.2" fill="#0d9488"/><rect x="13" y="26" width="20" height="2.2" rx="1.1" fill="#94a3b8"/><rect x="13" y="31" width="20" height="2.2" rx="1.1" fill="#94a3b8"/><rect x="13" y="36" width="13" height="2.2" rx="1.1" fill="#94a3b8"/>`,

    grafico: (u) => `<defs>${lineal(`${u}a`, "#5eead4", "#0d9488")}${lineal(`${u}b`, "#93c5fd", "#3b82f6")}${lineal(`${u}c`, "#c4b5fd", "#7c3aed")}</defs>`
        + `<rect x="5" y="6" width="38" height="36" rx="5" fill="#f8fafc" stroke="#0f172a" stroke-opacity=".12"/>`
        + `<rect x="11" y="25" width="6" height="11" rx="1.6" fill="url(#${u}b)"/><rect x="21" y="18" width="6" height="18" rx="1.6" fill="url(#${u}a)"/><rect x="31" y="12" width="6" height="24" rx="1.6" fill="url(#${u}c)"/>`
        + `<path d="M10 37.5h28" stroke="#94a3b8" stroke-width="1.4" stroke-linecap="round"/>`,

    perfil: (u) => `<defs>${lineal(`${u}a`, "#e0f2fe", "#bae6fd")}${lineal(`${u}b`, "#2dd4bf", "#0f766e", 1, 1)}</defs>`
        + `<rect x="4" y="8" width="40" height="32" rx="5" fill="url(#${u}a)"/><rect x="4.5" y="8.5" width="39" height="31" rx="4.5" fill="none" stroke="#0c4a6e" stroke-opacity=".15"/>`
        + `<circle cx="16.5" cy="22" r="7" fill="url(#${u}b)"/><circle cx="16.5" cy="20" r="2.8" fill="#f0fdfa"/><path d="M11.8 27.2a5.4 5.4 0 0 1 9.4 0" fill="#f0fdfa"/>`
        + `<rect x="27" y="17" width="12" height="2.6" rx="1.3" fill="#0c4a6e" fill-opacity=".75"/><rect x="27" y="22.4" width="10" height="2.2" rx="1.1" fill="#0c4a6e" fill-opacity=".35"/><rect x="27" y="27.2" width="8" height="2.2" rx="1.1" fill="#0c4a6e" fill-opacity=".35"/>`
        + `<rect x="10" y="33" width="28" height="2" rx="1" fill="#0c4a6e" fill-opacity=".2"/>`,

    plano: (u) => `<defs>${lineal(`${u}a`, "#3b82f6", "#1e3a8a", 1, 1)}<pattern id="${u}p" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".6"/></pattern></defs>`
        + `<rect x="5" y="6" width="38" height="36" rx="5" fill="url(#${u}a)"/><rect x="5" y="6" width="38" height="36" rx="5" fill="url(#${u}p)"/>`
        + `<path d="M19.5 18.5 13 24l6.5 5.5M28.5 18.5 35 24l-6.5 5.5M26 16.5l-4 15" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,

    enlace: (u) => `<defs>${lineal(`${u}a`, "#5eead4", "#2563eb", 1, 1)}</defs>`
        + `<circle cx="24" cy="24" r="18" fill="url(#${u}a)"/>`
        + `<path d="M6 24h36M24 6c5 5 7 11 7 18s-2 13-7 18c-5-5-7-11-7-18s2-13 7-18Z" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.8"/>`,

    widgets: (u) => `<defs>${lineal(`${u}a`, "#5eead4", "#0d9488")}${lineal(`${u}b`, "#93c5fd", "#3b82f6")}${lineal(`${u}c`, "#fcd34d", "#f59e0b")}${lineal(`${u}d`, "#c4b5fd", "#7c3aed")}</defs>`
        + `<rect x="6" y="6" width="16.5" height="16.5" rx="4.5" fill="url(#${u}a)"/><rect x="25.5" y="6" width="16.5" height="16.5" rx="4.5" fill="url(#${u}b)"/>`
        + `<rect x="6" y="25.5" width="16.5" height="16.5" rx="4.5" fill="url(#${u}c)"/><rect x="25.5" y="25.5" width="16.5" height="16.5" rx="4.5" fill="url(#${u}d)"/>`,
};

/** La flechita de los accesos directos, abajo a la izquierda. */
export const FLECHA_ACCESO = `<rect x="2" y="32" width="14" height="14" rx="3" fill="#f8fafc" stroke="#0f172a" stroke-opacity=".25"/><path d="M6.5 41.5l5-5M8 36.5h3.5V40" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
