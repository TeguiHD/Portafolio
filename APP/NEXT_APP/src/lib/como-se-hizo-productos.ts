/**
 * El estudio de cada producto, para /como-se-hizo. Las cifras se calculan de los mismos datos que publica cada página
 * (la edición del índice, el catálogo de herramientas, las mediciones de los servicios): si cambian, cambian aquí.
 * Las afirmaciones salen de los diseños de docs/superpowers/specs/ y de las pruebas que se nombran.
 */
import type { Fuente } from "./como-se-hizo";
import { CATEGORIAS, EDICION, RUTA, sitiosDe } from "./indice/datos";
import { MEDICION, SERVICIOS } from "./servicios";
import { DEFAULT_TOOL_REGISTRY } from "./tool-registry";
import { TOOL_COUNT } from "./tool-count";

export interface Producto {
    id: string;
    nombre: string;
    href: string;
    /** El texto del enlace a la página del producto. */
    ir: string;
    para: string;
    reviso: string;
    funciona: string;
    comprueba: string;
    fuentes: Fuente[];
    /** Dónde sigue el estudio completo, si lo hay (la metodología del índice). */
    mas?: { texto: string; href: string };
}

const grupos = CATEGORIAS.filter((c) => sitiosDe(c.id).length).length;
const instituciones = EDICION.sitios.length;
const enNavegador = DEFAULT_TOOL_REGISTRY.filter((t) => !t.donde).length;
const catalogo = SERVICIOS.find((s) => s.slug === "herramientas-web")?.caso.medidas.find((m) => m.pagina === "Catálogo de herramientas" && m.dispositivo === "celular");
const numero = (n: number) => n.toLocaleString("es-CL");

export const PRODUCTOS: Producto[] = [
    {
        id: "indice",
        nombre: "Índice de la Web Chilena",
        href: RUTA,
        ir: "Ver el índice",
        para: "Saber cómo están los sitios de las instituciones públicas y las universidades de Chile, con una nota comparable, una ficha por sitio y datos abiertos.",
        reviso: `${numero(instituciones)} instituciones de ${grupos} grupos, todas las de cada grupo y sin elegir. La lista salió de Wikidata y de las listas oficiales de cada grupo (el SIES para las universidades, el directorio de organismos del Portal de Transparencia para los servicios), y cada dirección se comprobó abriéndola.`,
        funciona: `Cada portada se mide con ${EDICION.lighthouse ? `Lighthouse ${EDICION.lighthouse}` : "Lighthouse"} como celular y con revisiones propias de buscadores, IA, seguridad, correo, privacidad y directorios. Cuando Lighthouse pudo medir, la nota general es el promedio de las dimensiones medidas.`,
        comprueba: "Las pruebas recalculan las dimensiones con casos conocidos (un robots.txt que bloquea, un certificado por vencer, una portada que el servidor no deja leer) y revisan que cada ficha muestre sus siete dimensiones.",
        fuentes: [],
        mas: { texto: "Cómo se midió, con todas sus fuentes", href: `${RUTA}/metodologia` },
    },
    {
        id: "herramientas",
        nombre: "Herramientas",
        href: "/herramientas",
        ir: "Ver las herramientas",
        para: `Resolver tareas comunes (imágenes, QR, contraseñas, JSON, redes y cálculos chilenos) sin registrarse. ${enNavegador} de las ${TOOL_COUNT} corren enteras en tu navegador: lo que escribes o subes no sale de tu equipo.`,
        reviso: "QRCode Monkey, TQRCG, remove.bg, TinyPNG, Bitwarden, 1Password y JSON Formatter para lo que hace cada una; Smallpdf, iLovePDF e it-tools para el orden de la página (21-11-2026).",
        funciona: "Una sola cabecera con el nombre, una línea de qué hace y dónde se procesa; dos anchos según la herramienta y, donde se puede, un resultado de ejemplo antes de tocar nada. Cada una tiene su propio «Cómo se hizo».",
        comprueba: "Una prueba abre todas las del catálogo y falla si aparece un emoji de adorno o un botón con degradado; otras revisan que sorteos, unidades y reverse shells abran con un ejemplo listo.",
        fuentes: [],
    },
    {
        id: "servicios",
        nombre: "Servicios",
        href: "/servicios",
        ir: "Ver los servicios",
        para: "Responder en el primer párrafo la pregunta que alguien le hace a un buscador o a una IA: quién hace tiendas en línea, sistemas internos o herramientas a medida en Chile.",
        reviso: "Cómo leen las IA un sitio: sus rastreadores no ejecutan JavaScript (medición de Vercel) y, al leer en vivo, los asistentes toman el texto visible y no los metadatos (experimento de searchVIU).",
        funciona: `Cada servicio dice qué incluye, cuándo conviene y cuándo no, cómo se trabaja y un caso real, con cifras medidas con ${MEDICION.herramienta} el ${MEDICION.fecha} cuando el sitio es público. Sin precios ni plazos inventados: se cotiza con propuesta escrita.`,
        comprueba: "Las pruebas abren cada servicio sin JavaScript y revisan que la respuesta esté en el primer párrafo, que no haya precios ni plazos y que el caso diga su fecha y su fuente.",
        fuentes: [
            { nombre: "The rise of the AI crawler (Vercel)", url: "https://vercel.com/blog/the-rise-of-the-ai-crawler" },
            { nombre: "Schema markup and AI put to the test (searchVIU)", url: "https://www.searchviu.com/en/schema-markup-and-ai-in-2025-what-chatgpt-claude-perplexity-gemini-really-see/" },
        ],
    },
    {
        id: "sitio",
        nombre: "El sitio",
        href: "/",
        ir: "Ir a la portada",
        para: "Que un cliente o un empleador confíe y escriba.",
        reviso: "Una maqueta aprobada antes de construir (16 y 17-11-2026) y la guía de patrones web modernos de Google Chrome: primero lo que ya trae el navegador y, si no alcanza, JavaScript propio.",
        funciona: `Un solo cuerpo de partículas que cambia de forma en cada sección, casi sin texto arriba, en tema claro y oscuro. El texto de la primera pantalla nunca parte invisible, porque eso atrasa el LCP que mide Google.${catalogo ? ` El catálogo de herramientas midió ${catalogo.rendimiento} en rendimiento y ${catalogo.accesibilidad} en accesibilidad en celular (${MEDICION.herramienta}, ${MEDICION.fecha}).` : ""}`,
        comprueba: "Las pruebas revisan la materia, la barra, el pie, los dos temas (el botón principal cumple el contraste AA en ambos) y la portada a seis anchos de celular, de 240 a 390 px.",
        fuentes: [],
    },
];
