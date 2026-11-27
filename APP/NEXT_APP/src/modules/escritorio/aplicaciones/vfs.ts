import { ACCESOS, APPS, appHerramienta, EN_ESCRITORIO, FAMILIAS, type App } from "../apps";
import type { IconoApp } from "../iconos/Icono";
import type { Args, HerramientaEscritorio, ProyectoEscritorio, ServicioEscritorio } from "../tipos";

/**
 * El árbol del Explorador: carpetas armadas con los datos reales del sitio (proyectos y sus capturas, servicios,
 * herramientas por familia y documentos). Funciones puras (tests/e2e/escritorio-logica.spec.ts).
 */
export type Apertura = { app: string; args?: Args } | { externo: string };
export interface Nodo {
    ruta: string;
    nombre: string;
    tipo: "carpeta" | "app" | "pagina" | "imagen" | "enlace";
    icono: IconoApp;
    abrir?: Apertura;
    miniatura?: string;
    /** Qué es, en palabras (la columna «Tipo» de la vista de detalles). */
    clase: string;
    /** Un acceso a una carpeta: el Explorador la abre ahí mismo, en esa ruta (las carpetas de «Escritorio»). */
    ir?: string;
    /** Lleva la flechita de acceso directo, como en el escritorio. */
    acceso?: boolean;
    descripcion?: string;
    hijos?: Nodo[];
}
export interface DatosArbol { herramientas: HerramientaEscritorio[]; proyectos: ProyectoEscritorio[]; servicios: ServicioEscritorio[] }

/** Las capturas de un proyecto en el orden en que Fotos las recorre: las de escritorio y después las de celular. */
export function fotosDe(p: ProyectoEscritorio): { nombre: string; src: string; alt: string }[] {
    const vistas = p.vistas?.length ? p.vistas : [{ nombre: "Portada", escritorio: p.imagen }];
    return [
        ...vistas.map((v) => ({ nombre: `${v.nombre}.jpg`, src: v.escritorio, alt: `${p.titulo}: ${v.nombre.toLowerCase()} en el computador` })),
        ...vistas.filter((v) => v.celular).map((v) => ({ nombre: `${v.nombre} en celular.jpg`, src: v.celular as string, alt: `${p.titulo}: ${v.nombre.toLowerCase()} en el celular` })),
    ];
}

const DOCUMENTOS: { app: string; nombre: string; icono: IconoApp; clase: string }[] = [
    { app: "sobre-mi", nombre: "Sobre mí", icono: "perfil", clase: "Página" },
    { app: "como-se-hizo", nombre: "Cómo se hizo", icono: "plano", clase: "Página" },
    { app: "indice", nombre: "Índice de la Web Chilena", icono: "grafico", clase: "Página" },
    { app: "blog", nombre: "Blog", icono: "noticias", clase: "Página" },
    { app: "privacidad", nombre: "Privacidad", icono: "documento", clase: "Documento" },
    { app: "terminos", nombre: "Términos", icono: "documento", clase: "Documento" },
];

/**
 * «Escritorio»: los mismos íconos que el escritorio, en su orden. Sus carpetas son accesos que el Explorador abre ahí
 * mismo (sin hijos propios, así buscar desde Inicio no repite lo que tienen dentro); el resto abre su app.
 */
function escritorioNodo(herramientas: HerramientaEscritorio[]): Nodo {
    const resolver = (id: string): App | null => {
        if (APPS[id]) return APPS[id];
        const t = herramientas.find((h) => `herramientas/${h.slug}` === id);
        return t ? appHerramienta(t) : null;
    };
    const hijos = EN_ESCRITORIO.flatMap((id): Nodo[] => {
        const a = resolver(id);
        if (!a) return [];
        const ruta = `escritorio/${id.replace(/\//g, "-")}`;
        if (a.vista === "explorador") return [{ ruta, nombre: a.titulo, tipo: "carpeta", icono: a.icono, clase: "Carpeta", descripcion: a.descripcion, ir: String(a.args?.carpeta ?? "") }];
        const acceso = ACCESOS.has(id);
        return [{
            ruta, nombre: a.titulo, tipo: a.tipo === "pagina" ? "pagina" : "app", icono: a.icono, descripcion: a.descripcion, abrir: { app: id },
            clase: acceso ? "Acceso directo" : a.tipo === "pagina" ? "Página" : "Aplicación", ...(acceso ? { acceso } : {}),
        }];
    });
    return { ruta: "escritorio", nombre: "Escritorio", tipo: "carpeta", icono: "escritorio", clase: "Carpeta", hijos };
}

export function arbol({ herramientas, proyectos, servicios }: DatosArbol): Nodo {
    const proyectosNodo: Nodo = {
        ruta: "proyectos", nombre: "Proyectos", tipo: "carpeta", icono: "carpeta-proyectos", clase: "Carpeta",
        hijos: proyectos.map((p) => ({
            ruta: `proyectos/${p.id}`, nombre: p.titulo, tipo: "carpeta" as const, icono: "carpeta" as const, clase: p.tipo, descripcion: p.texto,
            miniatura: p.vistas?.[0]?.escritorio ?? p.imagen,
            hijos: [
                ...fotosDe(p).map((f, i) => ({
                    ruta: `proyectos/${p.id}/${i}`, nombre: f.nombre, tipo: "imagen" as const, icono: "imagen" as const, clase: "Imagen", miniatura: f.src,
                    descripcion: f.alt, abrir: { app: "fotos", args: { proyecto: p.id, indice: i } },
                })),
                ...(p.href ? [{
                    ruta: `proyectos/${p.id}/sitio`, nombre: p.direccion ?? p.href.replace(/^https?:\/\//, ""), tipo: "enlace" as const, icono: "enlace" as const,
                    clase: "Acceso directo", descripcion: p.cta, abrir: { externo: p.href },
                }] : []),
            ],
        })),
    };
    const serviciosNodo: Nodo = {
        ruta: "servicios", nombre: "Servicios", tipo: "carpeta", icono: "carpeta-servicios", clase: "Carpeta",
        hijos: servicios.map((s) => ({ ruta: `servicios/${s.slug}`, nombre: s.nombre, tipo: "pagina" as const, icono: "documento" as const, clase: "Servicio", descripcion: s.resumen, abrir: { app: `servicios/${s.slug}` } })),
    };
    const herramientasNodo: Nodo = {
        ruta: "herramientas", nombre: "Herramientas", tipo: "carpeta", icono: "carpeta-herramientas", clase: "Carpeta",
        hijos: FAMILIAS.map((f) => ({
            ruta: `herramientas/${f.id}`, nombre: f.nombre, tipo: "carpeta" as const, icono: "carpeta" as const, clase: "Carpeta",
            hijos: herramientas.filter((t) => t.familia === f.familia).map((t) => ({
                ruta: `herramientas/${f.id}/${t.slug}`, nombre: t.nombre, tipo: "app" as const, icono: { herramienta: t.slug, familia: t.familia },
                clase: "Aplicación", descripcion: t.descripcion, abrir: { app: `herramientas/${t.slug}` },
            })),
        })).filter((f) => f.hijos.length > 0),
    };
    const documentosNodo: Nodo = {
        ruta: "documentos", nombre: "Documentos", tipo: "carpeta", icono: "carpeta-documentos", clase: "Carpeta",
        hijos: DOCUMENTOS.map((d) => ({ ruta: `documentos/${d.app}`, nombre: d.nombre, tipo: "pagina" as const, icono: d.icono, clase: d.clase, abrir: { app: d.app } })),
    };
    return { ruta: "", nombre: "Inicio", tipo: "carpeta", icono: "explorador", clase: "Carpeta", hijos: [escritorioNodo(herramientas), proyectosNodo, serviciosNodo, herramientasNodo, documentosNodo] };
}

export function buscarNodo(raiz: Nodo, ruta: string): Nodo | null {
    if (!ruta) return raiz;
    let n: Nodo | undefined = raiz;
    let camino = "";
    for (const parte of ruta.split("/")) {
        camino = camino ? `${camino}/${parte}` : parte;
        n = n?.hijos?.find((h) => h.ruta === camino);
        if (!n) return null;
    }
    return n ?? null;
}

export function padre(ruta: string): string | null {
    if (!ruta) return null;
    const i = ruta.lastIndexOf("/");
    return i < 0 ? "" : ruta.slice(0, i);
}

/** La cadena de carpetas desde Inicio hasta `ruta` (para las migas de la dirección). */
export function migas(raiz: Nodo, ruta: string): Nodo[] {
    const out: Nodo[] = [raiz];
    if (!ruta) return out;
    let camino = "";
    for (const parte of ruta.split("/")) {
        camino = camino ? `${camino}/${parte}` : parte;
        const n = buscarNodo(raiz, camino);
        if (!n) break;
        out.push(n);
    }
    return out;
}

/** Todo lo que cuelga de una carpeta, para buscar dentro de ella. */
export function aplanar(n: Nodo): Nodo[] {
    return (n.hijos ?? []).flatMap((h) => [h, ...aplanar(h)]);
}
