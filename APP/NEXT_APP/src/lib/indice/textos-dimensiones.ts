/**
 * Índice de la Web Chilena, edición 2026-12: qué mide cada dimensión, por qué importa, cómo se arregla cada control
 * y de dónde sale la regla (el «estudio» que muestran la metodología y cada ficha). El tono es el de los doce
 * controles de revision.ts: el dato dice lo que dice.
 */
import { CONTROLES } from "./revision";

export type IdDimension = "velocidad" | "buscadores" | "ia" | "seguridad" | "correo" | "privacidad" | "directorios";

export interface ControlTexto { id: string; nombre: string; porQue: string; arreglo: string }
export interface DimensionTexto {
    id: IdDimension;
    nombre: string;
    /** Para cabeceras de tabla angostas. */
    corto: string;
    /** Qué mide y por qué importa, en una o dos frases. */
    queMide: string;
    fuentes: { texto: string; url: string }[];
    controles: ControlTexto[];
}

const base = (id: string): ControlTexto => {
    const c = CONTROLES.find((x) => x.id === id)!;
    return { id: c.id, nombre: c.nombre, porQue: c.porQue, arreglo: c.arreglo };
};

export const DIMENSIONES: DimensionTexto[] = [
    {
        id: "velocidad", nombre: "Velocidad y calidad", corto: "Velocidad",
        queMide: "Las cuatro notas de Lighthouse en celular (rendimiento, accesibilidad, buenas prácticas y SEO), promediadas. Es lo mismo que mide PageSpeed Insights de Google.",
        fuentes: [{ texto: "Lighthouse, documentación de Chrome", url: "https://developer.chrome.com/docs/lighthouse/overview" }],
        controles: [],
    },
    {
        id: "buscadores", nombre: "Buscadores", corto: "Buscadores",
        queMide: "Si un buscador puede entrar, encontrar las páginas y entender la portada sin adivinar: robots.txt, mapa del sitio, dirección canónica, título y descripción.",
        fuentes: [
            { texto: "RFC 9309, protocolo de exclusión de robots", url: "https://www.rfc-editor.org/rfc/rfc9309" },
            { texto: "Protocolo de mapas del sitio (sitemaps.org)", url: "https://www.sitemaps.org/protocol.html" },
            { texto: "Google Search Central: URL canónicas", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" },
            { texto: "Protocolo Open Graph", url: "https://ogp.me/" },
        ],
        controles: [
            { id: "robots", nombre: "robots.txt responde y no cierra el sitio", porQue: "Es lo primero que lee un buscador: si prohíbe la portada a todos, o si el servidor da error al pedirlo, el sitio no se indexa.", arreglo: "Sirve un robots.txt que permita la portada (o no tengas uno: sin archivo, se puede rastrear todo)." },
            { id: "mapa", nombre: "Mapa del sitio", porQue: "Le dice al buscador qué páginas existen; sin él, solo encuentra las que tienen enlaces.", arreglo: "Publica /sitemap.xml (o decláralo en robots.txt con «Sitemap:»)." },
            { id: "canonica", nombre: "Dirección canónica", porQue: "Si la misma página responde en varias direcciones, el buscador reparte la autoridad entre ellas.", arreglo: "Agrega <link rel=\"canonical\" href=\"…\"> con la dirección principal." },
            { id: "h1", nombre: "Un solo título principal", porQue: "El h1 dice de qué trata la página; ninguno o varios lo dejan ambiguo.", arreglo: "Deja un único <h1> con el nombre de la institución o el tema de la portada." },
            { id: "vistaPrevia", nombre: "Vista previa al compartir", porQue: "Es la tarjeta que aparece al pegar el enlace en WhatsApp, LinkedIn o un correo.", arreglo: "Agrega og:title y og:image (Open Graph) en el <head>." },
            { id: "largoTitulo", nombre: "Título de 10 a 70 caracteres", porQue: "Un título muy corto («Inicio») no dice nada; uno muy largo se corta en los resultados.", arreglo: "Escribe un título con el nombre de la institución y qué se encuentra." },
            base("lang"), base("titulo"), base("descripcion"), base("viewport"), base("alt"),
        ],
    },
    {
        id: "ia", nombre: "IA", corto: "IA",
        queMide: "Si los asistentes de IA (ChatGPT, Claude, Perplexity) pueden leer el sitio para citarlo: que sus buscadores puedan entrar, que el texto esté en el HTML y que la página diga quién es la institución en datos estructurados. Es lo que se llama GEO, AEO o LLMO.",
        fuentes: [
            { texto: "OpenAI: OAI-SearchBot y GPTBot", url: "https://platform.openai.com/docs/bots" },
            { texto: "Perplexity: PerplexityBot", url: "https://docs.perplexity.ai/guides/bots" },
            { texto: "schema.org: GovernmentOrganization", url: "https://schema.org/GovernmentOrganization" },
        ],
        controles: [
            { id: "robotsBusqueda", nombre: "Deja entrar a los buscadores de IA", porQue: "OAI-SearchBot, Claude-SearchBot y PerplexityBot son los que leen la página cuando alguien pregunta: si el robots.txt los cierra, la IA no puede citar el sitio.", arreglo: "No los prohíbas en robots.txt (cerrar a los de entrenamiento, como GPTBot, es otra decisión y no se castiga)." },
            { id: "texto", nombre: "Texto legible sin JavaScript", porQue: "Muchos robots de IA no ejecutan JavaScript: si la portada se arma en el navegador, ven una página vacía.", arreglo: "Genera el contenido en el servidor (al menos 150 palabras en el HTML que entrega)." },
            { id: "datos", nombre: "Datos de la institución", porQue: "Un bloque JSON-LD con el nombre y la dirección oficial le confirma a buscadores e IA cuál es el sitio de la institución.", arreglo: "Agrega JSON-LD de tipo GovernmentOrganization (u Organization) con name y url." },
        ],
    },
    {
        id: "seguridad", nombre: "Seguridad", corto: "Seguridad",
        queMide: "Los siete controles de seguridad de la edición anterior, revisados en las cabeceras que entrega el servidor, más el certificado vigente.",
        fuentes: [{ texto: "OWASP Secure Headers Project", url: "https://owasp.org/www-project-secure-headers/" }],
        controles: [
            base("https"), base("redireccion"), base("hsts"), base("csp"), base("marcos"), base("nosniff"), base("referrer"),
            { id: "certificado", nombre: "Certificado vigente", porQue: "Un certificado vencido o por vencer muestra una advertencia a cada visita y corta el acceso.", arreglo: "Renueva el certificado antes de que falten 14 días (Let's Encrypt lo hace solo cada 60 días)." },
        ],
    },
    {
        id: "correo", nombre: "Correo y suplantación", corto: "Correo",
        queMide: "Si alguien puede mandar correos haciéndose pasar por la institución. Se revisa solo el DNS del dominio propio, sin tocar el sitio; no aplica si el sitio cuelga del dominio de otro organismo.",
        fuentes: [
            { texto: "RFC 7208, SPF", url: "https://www.rfc-editor.org/rfc/rfc7208" },
            { texto: "RFC 7489, DMARC", url: "https://www.rfc-editor.org/rfc/rfc7489" },
            { texto: "RFC 4033, DNSSEC", url: "https://www.rfc-editor.org/rfc/rfc4033" },
        ],
        controles: [
            { id: "spf", nombre: "SPF", porQue: "Lista qué servidores pueden enviar correo del dominio; sin ella, cualquiera puede intentarlo.", arreglo: "Publica un registro TXT «v=spf1 … -all» con tus servidores de correo." },
            { id: "dmarc", nombre: "DMARC que protege", porQue: "Le dice al correo que recibe qué hacer con un mensaje falso del dominio. Con «p=none» solo se informa: el falso llega igual.", arreglo: "Publica _dmarc con p=quarantine o p=reject (empieza con reportes y súbelo)." },
            { id: "dnssec", nombre: "DNSSEC", porQue: "Firma las respuestas del DNS para que nadie pueda desviar a otra dirección a quien escribe el dominio.", arreglo: "Actívalo con tu proveedor de DNS y publica el registro DS en NIC Chile." },
        ],
    },
    {
        id: "privacidad", nombre: "Privacidad", corto: "Privacidad",
        queMide: "Qué servicios de terceros rastrean a quien abre la portada, antes de que acepte nada. Se cuentan por tipo, según la clasificación de third-party-web que usa Lighthouse; un gestor de etiquetas no cuenta por sí solo.",
        fuentes: [{ texto: "third-party-web (entidades y categorías)", url: "https://github.com/patrickhulce/third-party-web" }],
        controles: [
            { id: "publicidad", nombre: "Sin publicidad de terceros", porQue: "Los servicios de anuncios siguen a la persona de sitio en sitio.", arreglo: "Quita los scripts de anuncios de la portada de un sitio público." },
            { id: "redes", nombre: "Sin rastreo de redes sociales", porQue: "Los botones y píxeles de redes sociales avisan a esas empresas quién visitó la página.", arreglo: "Usa enlaces simples a las redes en vez de sus scripts o píxeles." },
            { id: "analitica", nombre: "Sin analítica de terceros", porQue: "La analítica de otra empresa registra cada visita en sus servidores.", arreglo: "Usa analítica propia o sin cookies, o pide consentimiento antes de cargarla." },
            { id: "marketing", nombre: "Sin marketing ni grabación de sesiones", porQue: "Estas herramientas registran clics y movimientos de quien visita.", arreglo: "Cárgalas solo con consentimiento, o no las uses en la portada." },
        ],
    },
    {
        id: "directorios", nombre: "Directorios al día", corto: "Directorios",
        queMide: "Si el directorio que llena la propia institución lleva a su sitio actual: el Portal de Transparencia y, en municipios, el SINIM. Es de donde muchas personas, buscadores e IA sacan la dirección.",
        fuentes: [
            { texto: "Portal de Transparencia del Estado", url: "https://www.portaltransparencia.cl/" },
            { texto: "SINIM, ficha comunal (SUBDERE)", url: "https://datos.sinim.gov.cl/" },
        ],
        controles: [
            { id: "portal", nombre: "Portal de Transparencia", porQue: "La ficha de la institución en el Portal publica su sitio web; si la dirección está vieja, manda a la gente a otra parte.", arreglo: "Actualiza el sitio web en la ficha de la institución del Portal de Transparencia." },
            { id: "sinim", nombre: "SINIM", porQue: "La ficha comunal del SINIM es la fuente oficial de datos municipales y publica el sitio de cada municipio.", arreglo: "Pide a la SUBDERE actualizar el sitio web en la ficha comunal." },
        ],
    },
];

export const dimensionPorId = (id: IdDimension) => DIMENSIONES.find((d) => d.id === id)!;

/** Cuántos sitios cumplen cada control de una dimensión (entre los que tienen esa dimensión medida). */
export function cumplimientoDimension(sitios: import("./calculos").SitioMedido[], id: Exclude<IdDimension, "velocidad">) {
    const con = sitios.filter((s) => s.dim?.[id]);
    const d = dimensionPorId(id);
    return d.controles
        .map((k) => {
            const total = con.filter((s) => k.id in (s.dim![id]!.c as Record<string, boolean>)).length;
            const cumplen = con.filter((s) => (s.dim![id]!.c as Record<string, boolean>)[k.id] === true).length;
            return { id: k.id, nombre: k.nombre, cumplen, total, pct: total ? Math.round((cumplen / total) * 100) : 0 };
        })
        .filter((f) => f.total > 0);
}
