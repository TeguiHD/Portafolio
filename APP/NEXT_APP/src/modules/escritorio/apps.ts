import { COLOR_CATEGORIA, ICONOS, SIGLAS } from "../landing/viva/siglas";

/**
 * Lo que se abre en el modo escritorio. Cada app es una página real del sitio (en un iframe del mismo origen, sin la
 * barra ni el pie) o una vista propia del escritorio. Las herramientas salen del catálogo público.
 */
export type Vista = "proyectos" | "herramientas" | "configuracion" | "atajos";

export interface App {
    id: string;
    titulo: string;
    color: string;
    /** Contenido de un <svg viewBox="0 0 24 24"> de trazo. */
    glifo: string;
    /** La página que muestra la ventana. */
    ruta?: string;
    /** O una vista propia del escritorio. */
    vista?: Vista;
    /** Dónde se abre fuera del escritorio («Abrir en una pestaña»). */
    enlace?: string;
    /** Lo que la materia escribe mientras la ventana aparece. */
    sigla: string;
    /** Ancho y alto preferidos (px). */
    tam: [number, number];
}

export interface HerramientaEscritorio { slug: string; nombre: string; familia: string; ancho?: "estrecha" | "ancha" }

export const GLIFOS = {
    proyectos: '<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v9"/><path d="M6 16l3-3 2 2 2.5-2.5L16 15"/>',
    servicios: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18"/>',
    herramientas: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><circle cx="17" cy="7" r="3.5"/><path d="M7 13.5l3.5 6.5h-7z"/><rect x="13.5" y="13.5" width="7" height="7" rx="3.5"/>',
    sobremi: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/>',
    blog: '<path d="M4 5h16M4 10h16M4 15h11M4 20h7"/>',
    indice: '<path d="M4 20V11M9.5 20V5M15 20v-6M20.5 20V8M2.5 20.5h19"/>',
    conversemos: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.4-4.5a8.5 8.5 0 1 1 15.6-4.5z"/>',
    metodo: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12.5l2 2 4-4"/>',
    documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    configuracion: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    atajos: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
} as const;

export const APPS: Record<string, App> = {
    proyectos: { id: "proyectos", titulo: "Proyectos", color: "#fbbf24", glifo: GLIFOS.proyectos, vista: "proyectos", enlace: "/#proyectos", sigla: "Proyectos", tam: [920, 600] },
    servicios: { id: "servicios", titulo: "Servicios", color: "#a78bfa", glifo: GLIFOS.servicios, ruta: "/servicios", sigla: "Servicios", tam: [1120, 740] },
    herramientas: { id: "herramientas", titulo: "Herramientas", color: "#5eead4", glifo: GLIFOS.herramientas, vista: "herramientas", enlace: "/herramientas", sigla: "Herramientas", tam: [880, 640] },
    "sobre-mi": { id: "sobre-mi", titulo: "Sobre mí", color: "#7dd3fc", glifo: GLIFOS.sobremi, ruta: "/sobre-mi", sigla: "Hola", tam: [1080, 760] },
    blog: { id: "blog", titulo: "Blog", color: "#fb7185", glifo: GLIFOS.blog, ruta: "/blog", sigla: "Blog", tam: [1160, 780] },
    indice: { id: "indice", titulo: "Índice de la Web Chilena", color: "#34d399", glifo: GLIFOS.indice, ruta: "/indice-web-chilena", sigla: "Índice", tam: [1160, 780] },
    conversemos: { id: "conversemos", titulo: "Conversemos", color: "#5eead4", glifo: GLIFOS.conversemos, ruta: "/contacto", enlace: "/#contacto", sigla: "Hablemos", tam: [820, 660] },
    "como-se-hizo": { id: "como-se-hizo", titulo: "Cómo se hizo", color: "#93a1b5", glifo: GLIFOS.metodo, ruta: "/como-se-hizo", sigla: "Método", tam: [1080, 760] },
    privacidad: { id: "privacidad", titulo: "Privacidad", color: "#93a1b5", glifo: GLIFOS.documento, ruta: "/privacidad", sigla: "Privacidad", tam: [940, 720] },
    terminos: { id: "terminos", titulo: "Términos", color: "#93a1b5", glifo: GLIFOS.documento, ruta: "/terminos", sigla: "Términos", tam: [940, 720] },
    configuracion: { id: "configuracion", titulo: "Configuración", color: "#93a1b5", glifo: GLIFOS.configuracion, vista: "configuracion", sigla: "Ajustes", tam: [560, 640] },
    atajos: { id: "atajos", titulo: "Atajos de teclado", color: "#93a1b5", glifo: GLIFOS.atajos, vista: "atajos", sigla: "Atajos", tam: [560, 560] },
};

/** Los íconos del escritorio, en su orden de fábrica. */
export const EN_ESCRITORIO = ["proyectos", "servicios", "herramientas", "sobre-mi", "blog", "indice", "conversemos"];
/** Siempre en la barra de tareas, abiertas o no. */
export const ANCLADAS = ["proyectos", "herramientas", "conversemos"];
/** Las apps del menú de inicio, arriba de las herramientas. */
export const EN_INICIO = ["proyectos", "servicios", "herramientas", "sobre-mi", "blog", "indice", "conversemos", "configuracion"];
/** Las otras páginas del sitio, que el buscador del inicio también encuentra. */
export const PAGINAS = ["como-se-hizo", "privacidad", "terminos", "atajos"];

export const FAMILIAS = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes", "chile"] as const;

export function appHerramienta(t: HerramientaEscritorio): App {
    return {
        id: `herramientas/${t.slug}`, titulo: t.nombre, color: COLOR_CATEGORIA[t.familia] ?? "#5eead4", glifo: ICONOS[t.slug] ?? GLIFOS.herramientas,
        // Como app: la herramienta sola (/escritorio/app); «Abrir en una pestaña» lleva a su página en el sitio.
        ruta: `/escritorio/app/${t.slug}`, enlace: `/herramientas/${t.slug}`, sigla: SIGLAS[t.slug] || t.nombre, tam: t.ancho === "ancha" ? [1220, 800] : [1000, 760],
    };
}

/** La ventana que corresponde a un enlace del sitio (null si no tiene una). */
export function idDeRuta(ruta: string, hash: string): string | null {
    const p = ruta.replace(/\/+$/, "") || "/";
    if (p === "/") return hash === "#proyectos" ? "proyectos" : hash === "#contacto" ? "conversemos" : null;
    const h = /^\/herramientas\/([a-z0-9-]+)$/.exec(p);
    if (h) return `herramientas/${h[1]}`;
    if (p === "/herramientas") return "herramientas";
    for (const a of Object.values(APPS)) if (a.ruta && (p === a.ruta || p.startsWith(`${a.ruta}/`))) return a.id;
    return null;
}
