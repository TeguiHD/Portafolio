import { esFondo, type FondoId } from "./fondos";

/**
 * Las preferencias del escritorio (las del sonido van aparte, en sonido.ts). Se guardan en este navegador y se validan
 * campo por campo: un dato roto o de la versión anterior cae a lo de fábrica sin romper nada.
 */
export interface PrefsEscritorio {
    /** null: el fondo sigue al tema (Pampa en oscuro, Cordillera en claro). */
    fondo: FondoId | null;
    solido: string;
    alinear: "centro" | "izq";
    iconos: "grandes" | "medianos" | "pequenos";
    animaciones: boolean;
    noMolestar: boolean;
    /** null: las ancladas de fábrica. */
    anclados: string[] | null;
}

export const PREFS_BASE: PrefsEscritorio = { fondo: null, solido: "#0b1320", alinear: "centro", iconos: "medianos", animaciones: true, noMolestar: false, anclados: null };
const CLAVE = "escritorio:prefs";

export function interpretarPrefs(texto: string | null): PrefsEscritorio {
    const p: PrefsEscritorio = { ...PREFS_BASE };
    try {
        const g = JSON.parse(texto ?? "null") as Record<string, unknown> | null;
        if (!g || typeof g !== "object") return p;
        if (esFondo(g.fondo)) p.fondo = g.fondo;
        if (typeof g.solido === "string" && /^#[0-9a-f]{6}$/i.test(g.solido)) p.solido = g.solido;
        if (g.alinear === "centro" || g.alinear === "izq") p.alinear = g.alinear;
        if (g.iconos === "grandes" || g.iconos === "medianos" || g.iconos === "pequenos") p.iconos = g.iconos;
        if (typeof g.animaciones === "boolean") p.animaciones = g.animaciones;
        if (typeof g.noMolestar === "boolean") p.noMolestar = g.noMolestar;
        if (Array.isArray(g.anclados)) p.anclados = g.anclados.filter((x): x is string => typeof x === "string").slice(0, 12);
    } catch { /* dato roto: lo de fábrica */ }
    return p;
}

export function leerPrefs(): PrefsEscritorio {
    let texto: string | null = null;
    try { texto = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
    return interpretarPrefs(texto);
}

export function guardarPrefs(p: PrefsEscritorio) {
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* vale para esta visita */ }
}
