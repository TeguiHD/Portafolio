/**
 * Índice de la Web Chilena, edición 2026-12: lo que se lee de cada portada para las dimensiones nuevas (buscadores,
 * IA, privacidad, correo). Funciones puras y sin imports: las usa el medidor (scripts/indice/medir.mjs) directo con
 * Node, y las pruebas (tests/e2e/indice-dimensiones.spec.ts).
 * Diseño: docs/superpowers/specs/2026-11-23-indice-ampliado-design.md
 */

/* ---------- robots.txt (RFC 9309) ---------- */

export interface Robots {
    /** Respondió (2xx o 4xx). Un 5xx o la falta de respuesta cuentan como «no responde». */
    responde: boolean;
    /** Prohíbe la portada a cualquier robot que no tenga un grupo propio. */
    bloqueaTodo: boolean;
    sitemaps: string[];
    /** Si el robot (su nombre de producto, p. ej. «GPTBot») puede pedir la ruta (por omisión, la portada). */
    permite(robot: string, ruta?: string): boolean;
}

interface Regla { permitir: boolean; patron: string }
interface Grupo { agentes: string[]; reglas: Regla[] }

/** El patrón de una regla como expresión regular anclada al inicio: «*» es cualquier cosa y un «$» final, el fin. */
function patronARegex(p: string): RegExp {
    const fin = p.endsWith("$");
    const cuerpo = (fin ? p.slice(0, -1) : p).split("*").map((t) => t.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp(`^${cuerpo}${fin ? "$" : ""}`);
}

/**
 * Lee un robots.txt. `estado` es el código HTTP (null si no respondió). Sin archivo (4xx) se puede rastrear todo; con
 * error de servidor o sin respuesta, se debe suponer que prohíbe todo (RFC 9309, 2.3.1.3 y 2.3.1.4).
 */
export function leerRobots(texto: string | null, estado: number | null): Robots {
    const responde = estado !== null && estado < 500;
    const todoPermitido = estado !== null && estado >= 400 && estado < 500;
    const grupos: Grupo[] = [], sitemaps: string[] = [];
    // Un servidor que responde la portada en vez de un robots.txt no da reglas.
    const esHtml = !!texto && /^\s*</.test(texto);
    if (responde && !todoPermitido && texto && !esHtml) {
        let actual: Grupo | null = null, enReglas = false;
        for (const linea of texto.slice(0, 500_000).split(/\r?\n/)) {
            const sin = linea.replace(/#.*$/, "").trim();
            const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(sin);
            if (!m) continue;
            const clave = m[1]!.toLowerCase(), valor = m[2]!.trim();
            if (clave === "user-agent") {
                if (!actual || enReglas) { actual = { agentes: [], reglas: [] }; grupos.push(actual); enReglas = false; }
                actual.agentes.push(valor.toLowerCase().split("/")[0]!.trim());
            } else if (clave === "allow" || clave === "disallow") {
                if (!actual) continue;
                enReglas = true;
                if (valor) actual.reglas.push({ permitir: clave === "allow", patron: valor });
            } else if (clave === "sitemap" && valor) sitemaps.push(valor);
        }
    }
    const reglasDe = (robot: string): Regla[] => {
        const r = robot.toLowerCase();
        const propios = robot === "*" ? [] : grupos.filter((g) => g.agentes.includes(r));
        const elegidos = propios.length ? propios : grupos.filter((g) => g.agentes.includes("*"));
        return elegidos.flatMap((g) => g.reglas);
    };
    const permite = (robot: string, ruta = "/") => {
        if (!responde) return false;
        if (todoPermitido) return true;
        let mejor: Regla | null = null;
        for (const regla of reglasDe(robot)) {
            if (!patronARegex(regla.patron).test(ruta)) continue;
            if (!mejor || regla.patron.length > mejor.patron.length || (regla.patron.length === mejor.patron.length && regla.permitir)) mejor = regla;
        }
        return mejor ? mejor.permitir : true;
    };
    return { responde, bloqueaTodo: responde && !permite("*"), sitemaps, permite };
}

/** Los robots de búsqueda de las IA (los que traen visitas citando) y los de entrenamiento. */
export const ROBOTS_BUSQUEDA_IA = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"] as const;
export const ROBOTS_ENTRENAMIENTO_IA = ["GPTBot", "ClaudeBot", "Google-Extended"] as const;

/* ---------- La portada que entrega el servidor ---------- */

export interface HtmlExtra {
    canonica: boolean;
    h1: number;
    /** Vista previa al compartir: og:title y og:image con contenido. */
    og: boolean;
    largoTitulo: number;
    /** El título tal cual (para reconocer un aviso de mantención). */
    titulo: string;
    /** Palabras de texto visible en el HTML del servidor (sin ejecutar JavaScript). */
    palabras: number;
    /** JSON-LD de la institución (Organization o un subtipo), con nombre y url. */
    institucion: boolean;
    /** Tipos de JSON-LD encontrados. */
    tiposLd: string[];
    /** El meta generator («WordPress 5.8.2»), o null. */
    generador: string | null;
}

const TIPOS_INSTITUCION = new Set([
    "Organization", "GovernmentOrganization", "GovernmentOffice", "EducationalOrganization", "CollegeOrUniversity", "School",
    "Hospital", "MedicalOrganization", "MedicalClinic", "NGO", "Corporation", "LocalBusiness", "PoliceStation",
]);

function atributo(etiqueta: string, nombre: string): string | null {
    const m = new RegExp(`\\s${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(etiqueta);
    return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}
const entidadesBasicas = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * Lo que se lee del HTML para las dimensiones nuevas. Como en revision.ts, el HTML es de terceros: ninguna expresión
 * vuelve a recorrer el texto desde cada «<» (los bloques sin cerrar corren hasta el final y las etiquetas se cortan en
 * el siguiente «<»).
 */
export function revisarHtmlExtra(html: string): HtmlExtra {
    const h = html.slice(0, 3_000_000).replace(/<!--[\s\S]*?(?:-->|$)/g, "");
    // Los JSON-LD se leen antes de quitar los scripts.
    const nodos: Record<string, unknown>[] = [];
    for (const m of h.matchAll(/<script\b[^<>]*type\s*=\s*["']?application\/ld\+json["']?[^<>]*>([\s\S]*?)(?:<\/script\s*>|$)/gi)) {
        try {
            const pila: unknown[] = [JSON.parse(m[1]!)];
            while (pila.length && nodos.length < 200) {
                const x = pila.pop();
                if (Array.isArray(x)) pila.push(...x);
                else if (x && typeof x === "object") {
                    const o = x as Record<string, unknown>;
                    nodos.push(o);
                    if (o["@graph"]) pila.push(o["@graph"]);
                }
            }
        } catch { /* JSON-LD roto: no cuenta */ }
    }
    const tiposDe = (o: Record<string, unknown>) => [o["@type"]].flat().filter((t): t is string => typeof t === "string");
    const tiposLd = [...new Set(nodos.flatMap(tiposDe))];
    const institucion = nodos.some((o) => tiposDe(o).some((t) => TIPOS_INSTITUCION.has(t))
        && typeof o.name === "string" && o.name.trim().length > 0 && typeof o.url === "string" && o.url.trim().length > 0);

    const limpio = h.replace(/<script\b[\s\S]*?(?:<\/script\s*>|$)/gi, " ").replace(/<style\b[\s\S]*?(?:<\/style\s*>|$)/gi, " ")
        .replace(/<noscript\b[\s\S]*?(?:<\/noscript\s*>|$)/gi, " ");
    const links = limpio.match(/<link\b[^<>]*>/gi) ?? [];
    const canonica = links.some((l) => (atributo(l, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical") && (atributo(l, "href") ?? "").trim().length > 0);
    const metas = limpio.match(/<meta\b[^<>]*>/gi) ?? [];
    const meta = (clave: string) => metas.find((m) => ((atributo(m, "property") ?? atributo(m, "name") ?? "").toLowerCase() === clave));
    const con = (m: string | undefined) => !!m && (atributo(m, "content") ?? "").trim().length > 0;
    const titulo = entidadesBasicas(/<title\b[^<>]*>([^<]*)/i.exec(limpio)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const generador = meta("generator") ? (atributo(meta("generator")!, "content") ?? "").trim() || null : null;
    const cuerpo = /<body\b[^<>]*>([\s\S]*)$/i.exec(limpio)?.[1] ?? limpio;
    const texto = entidadesBasicas(cuerpo.replace(/<[^<>]*>?/g, " "));
    const palabras = texto.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
    return {
        canonica,
        h1: (limpio.match(/<h1\b/gi) ?? []).length,
        og: con(meta("og:title")) && con(meta("og:image")),
        largoTitulo: titulo.length,
        titulo: titulo.slice(0, 200),
        palabras,
        institucion,
        tiposLd,
        generador,
    };
}

/* ---------- Rastreadores de terceros ---------- */

export interface Rastreadores {
    tipos: { publicidad: boolean; redes: boolean; analitica: boolean; marketing: boolean };
    /** Nombres de los servicios de terceros que rastrean (sin el gestor de etiquetas). */
    nombres: string[];
}

/**
 * Clasifica las peticiones de la portada con las entidades de third-party-web (las que trae Lighthouse). `entidad`
 * recibe una URL y devuelve { name, category } o null. Las peticiones al propio sitio no cuentan; el gestor de
 * etiquetas tampoco por sí solo (cuenta lo que carga).
 */
export function clasificarRastreadores(urls: string[], hostSitio: string, entidad: (url: string) => { name: string; category: string } | null): Rastreadores {
    const propio = dominioPropio(hostSitio);
    const propia = entidad(`https://${hostSitio}/`)?.name ?? null;
    const tipos = { publicidad: false, redes: false, analitica: false, marketing: false };
    const nombres = new Set<string>();
    for (const u of urls) {
        let host: string;
        try { host = new URL(u).hostname; } catch { continue; }
        if (dominioPropio(host) === propio) continue;
        const e = entidad(u);
        if (!e || e.name === propia) continue;
        const clave = e.category === "ad" ? "publicidad" : e.category === "social" ? "redes" : e.category === "analytics" ? "analitica"
            : e.category === "marketing" || e.category === "customer-success" ? "marketing" : null;
        if (!clave) continue;
        tipos[clave] = true;
        nombres.add(e.name);
    }
    return { tipos, nombres: [...nombres] };
}

/* ---------- Dominio propio (para el correo) ---------- */

/** Sufijos públicos de Chile donde cada organismo tiene su propio dominio debajo (gob.cl, gov.cl, mil.cl, co.cl). */
const SUFIJOS_CL = new Set(["gob.cl", "gov.cl", "mil.cl", "co.cl"]);

/** El dominio registrable de un host: «www.dt.gob.cl» → «dt.gob.cl»; «barrancas.educacionpublica.cl» → «educacionpublica.cl». */
export function dominioPropio(host: string): string {
    const partes = host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "").split(".");
    const dos = partes.slice(-2).join(".");
    return SUFIJOS_CL.has(dos) && partes.length >= 3 ? partes.slice(-3).join(".") : dos;
}

/* ---------- Las siete dimensiones (las calcula el compilador con lo medido) ---------- */

/** Lo que guarda el medidor por sitio (scripts/indice/medir.mjs), en lo que usan las dimensiones. */
export interface MedicionSitio {
    fecha: string;
    estadoHttp: number | null;
    notas: { rendimiento: number; accesibilidad: number; practicas: number; seo: number } | null;
    revision: Record<"https" | "redireccion" | "hsts" | "csp" | "marcos" | "nosniff" | "referrer" | "lang" | "titulo" | "descripcion" | "viewport" | "alt", boolean> | null;
    extra: {
        html: HtmlExtra;
        robots: { estado: number | null; texto: string | null };
        sitemap: { url: string; estado: number | null; esXml: boolean };
        llms: { estado: number | null; esTexto: boolean };
        certificado: { vence: string | null; valido: boolean; error: string | null } | null;
        software: { poweredBy: string | null; server: string | null };
    } | null;
    rastreadores?: Rastreadores | null;
}

/** Lo que viene de afuera del sitio: el DNS de su dominio propio (null si no aplica) y los directorios donde está. */
export interface ContextoSitio {
    correo: { spf: boolean; dmarc: string | null; dnssec: boolean } | null;
    directorios: { portal?: boolean | null; sinim?: boolean | null };
}

export interface Dimension<C extends string> { nota: number; c: Record<C, boolean> }
export interface Dimensiones {
    velocidad: number | null;
    buscadores: Dimension<"robots" | "mapa" | "canonica" | "h1" | "vistaPrevia" | "largoTitulo" | "lang" | "titulo" | "descripcion" | "viewport" | "alt"> | null;
    ia: (Dimension<"robotsBusqueda" | "texto" | "datos"> & { entrenamiento: boolean; llms: boolean }) | null;
    seguridad: Dimension<"https" | "redireccion" | "hsts" | "csp" | "marcos" | "nosniff" | "referrer" | "certificado"> | null;
    correo: Dimension<"spf" | "dmarc" | "dnssec"> | null;
    privacidad: (Dimension<"publicidad" | "redes" | "analitica" | "marketing"> & { nombres: string[] }) | null;
    directorios: Dimension<string> | null;
}

const dimension = <C extends string>(c: Record<C, boolean>): Dimension<C> => {
    const v = Object.values(c) as boolean[];
    return { nota: Math.round((v.filter(Boolean).length / v.length) * 100), c };
};

const DIA = 86_400_000;

/**
 * Las siete dimensiones de un sitio. Lo que no se pudo leer queda null («sin dato»), nunca como reprobado: un servidor
 * que respondió error a nuestra visita sin navegador no pierde puntos de buscadores, IA ni seguridad por eso.
 */
export function calcularDimensiones(m: MedicionSitio, ctx: ContextoSitio): Dimensiones {
    const n = m.notas;
    const velocidad = n ? Math.round((n.rendimiento + n.accesibilidad + n.practicas + n.seo) / 4) : null;
    const leida = !!m.revision && !!m.extra && (m.estadoHttp ?? 200) < 400;
    let buscadores: Dimensiones["buscadores"] = null, ia: Dimensiones["ia"] = null, seguridad: Dimensiones["seguridad"] = null;
    if (leida) {
        const r = m.revision!, x = m.extra!, h = x.html;
        const robots = leerRobots(x.robots.texto, x.robots.estado);
        buscadores = dimension({
            robots: robots.responde && !robots.bloqueaTodo, mapa: x.sitemap.esXml, canonica: h.canonica, h1: h.h1 === 1, vistaPrevia: h.og,
            largoTitulo: h.largoTitulo >= 10 && h.largoTitulo <= 70, lang: r.lang, titulo: r.titulo, descripcion: r.descripcion, viewport: r.viewport, alt: r.alt,
        });
        ia = {
            ...dimension({ robotsBusqueda: ROBOTS_BUSQUEDA_IA.every((b) => robots.permite(b)), texto: h.palabras >= 150, datos: h.institucion }),
            entrenamiento: ROBOTS_ENTRENAMIENTO_IA.every((b) => robots.permite(b)),
            llms: x.llms.esTexto,
        };
        const cert = x.certificado;
        seguridad = dimension({
            https: r.https, redireccion: r.redireccion, hsts: r.hsts, csp: r.csp, marcos: r.marcos, nosniff: r.nosniff, referrer: r.referrer,
            certificado: !!cert?.valido && !!cert.vence && new Date(cert.vence).getTime() - new Date(m.fecha).getTime() > 14 * DIA,
        });
    }
    const correo = ctx.correo ? dimension({ spf: ctx.correo.spf, dmarc: ctx.correo.dmarc === "quarantine" || ctx.correo.dmarc === "reject", dnssec: ctx.correo.dnssec }) : null;
    const t = m.rastreadores?.tipos;
    const privacidad = t ? { ...dimension({ publicidad: !t.publicidad, redes: !t.redes, analitica: !t.analitica, marketing: !t.marketing }), nombres: m.rastreadores!.nombres } : null;
    const dirs = Object.fromEntries(Object.entries(ctx.directorios).filter((e): e is [string, boolean] => typeof e[1] === "boolean"));
    const directorios = Object.keys(dirs).length ? dimension(dirs) : null;
    return { velocidad, buscadores, ia, seguridad, correo, privacidad, directorios };
}

/** Nota general: el promedio de las dimensiones medidas, solo si hay Lighthouse (sin él, no hay nota general). */
export function notaGeneral(d: Dimensiones): number | null {
    if (d.velocidad === null) return null;
    const notas = [d.velocidad, d.buscadores?.nota, d.ia?.nota, d.seguridad?.nota, d.correo?.nota, d.privacidad?.nota, d.directorios?.nota]
        .filter((v): v is number => typeof v === "number");
    return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
}

/**
 * Si la respuesta de la IA nombra el sitio: el primer enlace o dominio que aparece, comparado por host exacto (sin
 * «www.») con los del sitio verificado. Un dominio padre compartido (educacionpublica.cl por un SLEP) no acierta.
 */
export function aciertaIa(texto: string | null, hosts: string[], redirige: Record<string, string | null> = {}): boolean {
    const host = hostDeRespuesta(texto);
    if (!host) return false;
    const propios = hosts.map(limpiarHost);
    // También acierta una dirección que hoy lleva al sitio (p. ej., el dominio antiguo de una delegación presidencial).
    const destino = redirige[host];
    return propios.includes(host) || (!!destino && propios.includes(limpiarHost(destino)));
}

const limpiarHost = (h: string) => h.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

/** El primer enlace o dominio que aparece en una respuesta, sin «www.»; null si no hay. */
export function hostDeRespuesta(texto: string | null): string | null {
    if (!texto) return null;
    const url = /https?:\/\/[^\s)>\]"'«»]+/i.exec(texto)?.[0];
    let host: string | null = null;
    if (url) { try { host = new URL(url).hostname; } catch { host = null; } }
    host ??= /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.exec(texto)?.[0] ?? null;
    return host ? limpiarHost(host) : null;
}
