import type { IconoApp } from "./iconos/Icono";
import type { Args, HerramientaEscritorio, ServicioEscritorio } from "./tipos";

/**
 * Lo que se abre en el modo escritorio. Hay tres clases de app:
 *  · vista: una app propia del escritorio (Explorador, Fotos, Correo, Noticias, Configuración);
 *  · herramienta: una herramienta del catálogo como app (/escritorio/app/<slug>, sin la página alrededor);
 *  · página: una página del sitio en el Lector (iframe del mismo origen, sin la barra ni el pie).
 */
export type VistaId = "explorador" | "fotos" | "correo" | "noticias" | "configuracion";

export interface App {
    id: string;
    titulo: string;
    icono: IconoApp;
    tipo: "vista" | "pagina" | "herramienta";
    /** La página que muestra la ventana (páginas y herramientas). */
    ruta?: string;
    /** La app propia que muestra (vistas). */
    vista?: VistaId;
    /** Con qué abre si no se le dice otra cosa (la carpeta de un acceso al Explorador). */
    args?: Args;
    /** Dónde se abre fuera del escritorio («Abrir en una pestaña»). */
    enlace?: string;
    /** Ancho y alto preferidos (px). */
    tam: [number, number];
    descripcion?: string;
    familia?: string;
    /** Dónde se procesa lo que la persona escribe o sube (herramientas). */
    donde?: string;
}

const explorador = (id: string, titulo: string, icono: IconoApp, carpeta: string, descripcion: string, enlace?: string): App =>
    ({ id, titulo, icono, tipo: "vista", vista: "explorador", args: { carpeta }, tam: [1000, 640], descripcion, enlace });
const pagina = (id: string, titulo: string, icono: IconoApp, ruta: string, descripcion: string, tam: [number, number] = [1100, 760]): App =>
    ({ id, titulo, icono, tipo: "pagina", ruta, enlace: ruta, tam, descripcion });

export const APPS: Record<string, App> = {
    explorador: explorador("explorador", "Explorador de archivos", "explorador", "", "Los proyectos, servicios, herramientas y documentos del sitio, en carpetas."),
    proyectos: explorador("proyectos", "Proyectos", "carpeta-proyectos", "proyectos", "Los proyectos, con sus capturas y el sitio real de cada uno.", "/#proyectos"),
    servicios: explorador("servicios", "Servicios", "carpeta-servicios", "servicios", "Lo que hago: tiendas, sistemas internos, sitios y más.", "/servicios"),
    herramientas: explorador("herramientas", "Herramientas", "carpeta-herramientas", "herramientas", "Las herramientas gratis del sitio, por familia.", "/herramientas"),
    documentos: explorador("documentos", "Documentos", "carpeta-documentos", "documentos", "Sobre mí, cómo se hizo el sitio, el índice y lo legal."),
    correo: { id: "correo", titulo: "Correo", icono: "correo", tipo: "vista", vista: "correo", enlace: "/#contacto", tam: [780, 620], descripcion: "Escríbeme un mensaje; te respondo desde contacto@nicoholas.dev." },
    noticias: { id: "noticias", titulo: "Noticias", icono: "noticias", tipo: "vista", vista: "noticias", enlace: "/blog", tam: [1060, 720], descripcion: "Titulares de seguridad, inteligencia artificial y desarrollo, de fuentes oficiales." },
    fotos: { id: "fotos", titulo: "Fotos", icono: "fotos", tipo: "vista", vista: "fotos", tam: [1080, 740], descripcion: "Las capturas reales de los proyectos." },
    configuracion: { id: "configuracion", titulo: "Configuración", icono: "configuracion", tipo: "vista", vista: "configuracion", tam: [1000, 680], descripcion: "Fondo, colores, barra de tareas, sonido y accesibilidad." },
    "sobre-mi": pagina("sobre-mi", "Sobre mí", "perfil", "/sobre-mi", "Quién soy, qué hago y con quién he trabajado."),
    blog: pagina("blog", "Blog", "noticias", "/blog", "Titulares, mercado y lo que estoy construyendo.", [1160, 780]),
    indice: pagina("indice", "Índice de la Web Chilena", "grafico", "/indice-web-chilena", "Cómo están los sitios públicos de Chile, medidos.", [1160, 780]),
    "como-se-hizo": pagina("como-se-hizo", "Cómo se hizo", "plano", "/como-se-hizo", "Con qué y cómo está hecho este sitio."),
    privacidad: pagina("privacidad", "Privacidad", "documento", "/privacidad", "Qué datos se guardan y para qué.", [940, 720]),
    terminos: pagina("terminos", "Términos", "documento", "/terminos", "Las condiciones de uso del sitio.", [940, 720]),
};

export function appHerramienta(t: HerramientaEscritorio): App {
    return {
        id: `herramientas/${t.slug}`, titulo: t.nombre, icono: { herramienta: t.slug, familia: t.familia }, tipo: "herramienta",
        // Como app: la herramienta sola; «Abrir en una pestaña» lleva a su página en el sitio.
        ruta: `/escritorio/app/${t.slug}`, enlace: `/herramientas/${t.slug}`,
        tam: t.ancho === "ancha" ? [1180, 780] : [920, 700], descripcion: t.descripcion, familia: t.familia, donde: t.donde,
    };
}

export function appServicio(s: ServicioEscritorio): App {
    return pagina(`servicios/${s.slug}`, s.nombre, "documento", `/servicios/${s.slug}`, s.resumen);
}

/** Los íconos del escritorio, en su orden de fábrica (columnas desde arriba a la izquierda, como Windows). */
export const EN_ESCRITORIO = ["proyectos", "servicios", "herramientas", "documentos", "sobre-mi", "correo", "noticias", "indice", "herramientas/qr", "herramientas/sueldo-liquido"];
/** Los que en el escritorio son accesos directos (llevan su flechita). */
export const ACCESOS = new Set(["herramientas/qr", "herramientas/sueldo-liquido"]);
/** Ancladas a la barra de tareas de fábrica. */
export const ANCLADAS_BARRA = ["explorador", "herramientas", "correo", "noticias"];
/** «Anclado» en el inicio, de fábrica. */
export const ANCLADAS_INICIO = [
    "proyectos", "servicios", "herramientas", "correo", "noticias", "fotos",
    "sobre-mi", "indice", "configuracion", "herramientas/qr", "herramientas/sueldo-liquido", "herramientas/comprimir-imagen",
    "herramientas/quitar-fondo", "herramientas/claves", "herramientas/uf-utm", "herramientas/rut", "como-se-hizo", "explorador",
];
/** Si no hay nada reciente, el inicio recomienda esto. */
export const SUGERIDAS = ["proyectos", "herramientas/qr", "noticias", "sobre-mi", "herramientas/sueldo-liquido", "correo"];

/** Las familias del catálogo, con su carpeta en el Explorador. */
export const FAMILIAS: { id: string; nombre: string; familia: string }[] = [
    { id: "imagenes", nombre: "Imágenes", familia: "imágenes" }, { id: "generacion", nombre: "Generación", familia: "generación" },
    { id: "conversion", nombre: "Conversión", familia: "conversión" }, { id: "productividad", nombre: "Productividad", familia: "productividad" },
    { id: "seguridad", nombre: "Seguridad", familia: "seguridad" }, { id: "redes", nombre: "Redes", familia: "redes" },
    { id: "chile", nombre: "Chile", familia: "chile" },
];

/** La ventana que corresponde a un enlace del sitio (null si no tiene una). */
export function idDeRuta(ruta: string, hash: string): string | null {
    const p = ruta.replace(/\/+$/, "") || "/";
    if (p === "/") return hash === "#proyectos" ? "proyectos" : hash === "#contacto" ? "correo" : null;
    if (p === "/contacto") return "correo";
    const h = /^\/herramientas\/([a-z0-9-]+)$/.exec(p);
    if (h) return `herramientas/${h[1]}`;
    const s = /^\/servicios\/([a-z0-9-]+)$/.exec(p);
    if (s) return `servicios/${s[1]}`;
    if (p === "/herramientas") return "herramientas";
    if (p === "/servicios") return "servicios";
    for (const a of Object.values(APPS)) if (a.tipo === "pagina" && a.ruta && (p === a.ruta || p.startsWith(`${a.ruta}/`))) return a.id;
    return null;
}
