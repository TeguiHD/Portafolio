/**
 * Junta la lista de entidades y las mediciones en el archivo que leen las páginas del índice.
 *
 * Uso: node scripts/indice/compilar.mjs <entidades.json> <carpeta-medidas> <edicion AAAA-MM> > src/data/indice/<edicion>.json
 *
 * Solo pasa lo que se publica: notas, métricas principales, peso, pedidos, los doce controles y las fallas de
 * accesibilidad. Una entidad cuyo sitio no cargó en dos intentos queda como «sin-respuesta» (también es un dato), igual
 * que una sin sitio web («sin-sitio» en la lista, con su motivo). Una con el sitio oficial sin confirmar («dudoso») queda
 * fuera, en «excluidas».
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const [, , archivoEntidades, carpeta, edicion] = process.argv;
if (!archivoEntidades || !carpeta || !/^\d{4}-\d{2}$/.test(edicion ?? "")) {
    console.error("Uso: node scripts/indice/compilar.mjs <entidades.json> <carpeta-medidas> <AAAA-MM>");
    process.exit(1);
}
const entidades = JSON.parse(await readFile(archivoEntidades, "utf8"));
const archivos = new Set(await readdir(carpeta));
const redondo = (v, d = 0) => (typeof v === "number" ? Math.round(v * 10 ** d) / 10 ** d : null);

/** El motivo en palabras: lo que se publica cuando un sitio no tiene nota. */
function motivoLegible(error) {
    const e = String(error ?? "");
    if (/MANTENCION/.test(e)) return "estaba en mantención al medirlo (la portada solo mostraba un aviso)";
    if (/DESAFIO/.test(e)) return "bloquea las visitas automáticas con un desafío anti-bots, así que no se pudo medir su portada real";
    if (/DNS|ENOTFOUND|resolve/i.test(e)) return "su dirección no existe o no resuelve";
    if (/NO_FCP|NO_LCP|4 minutos|PAGE_HUNG|timeout|TIMED_OUT/i.test(e)) return "no terminó de cargar";
    if (/CERT|SSL|TLS|INSECURE/i.test(e)) return "su certificado de seguridad no es válido";
    if (/ERRORED_DOCUMENT_REQUEST|FAILED_DOCUMENT_REQUEST|ECONNREFUSED|EHOSTUNREACH|ECONNRESET/i.test(e)) return "no respondió";
    if (/navegador/i.test(e)) return "el navegador no pudo abrirlo";
    return "no se pudo medir";
}

const sitios = [];
const excluidas = [];
const fechas = [];
let version = null;
for (const e of entidades) {
    const base = { slug: e.slug, nombre: e.nombre, categoria: e.categoria, region: e.region ?? null, ...(e.comuna ? { comuna: e.comuna } : {}), ...(e.tipo ? { tipo: e.tipo } : {}), url: e.url ?? null };
    // Sin un sitio oficial confirmado, la entidad queda fuera de la edición (y la metodología lo dice): medir uno
    // equivocado sería atribuirle notas ajenas, y listarla sin nota daría a entender que su sitio falló.
    if (e.estado === "dudoso") { excluidas.push({ nombre: e.nombre, categoria: e.categoria, motivo: "no se pudo confirmar cuál es su sitio oficial" }); continue; }
    // Está en la lista oficial pero no tiene sitio (el SIES no indica uno, o la dirección ya no es suya): sin nota, con su motivo.
    if (e.estado === "sin-sitio") { sitios.push({ ...base, estado: "sin-respuesta", motivo: e.motivo, fecha: e.revisado ?? null }); continue; }
    if (!archivos.has(`${e.slug}.json`)) { console.error(`sin medición: ${e.slug}`); continue; }
    const m = JSON.parse(await readFile(join(carpeta, `${e.slug}.json`), "utf8"));
    if (m.url !== e.url) { console.error(`medición con otra URL: ${e.slug} (${m.url} ≠ ${e.url})`); process.exitCode = 2; continue; }
    if (m.fecha) fechas.push(m.fecha);
    // Un desafío anti-bots (Cloudflare): sin navegador responde 403 y con navegador Lighthouse mide la página del desafío,
    // que redirige con meta refresh. Esas notas no son del sitio (en 2026-11 salían iguales en tres municipios distintos).
    if (m.estadoHttp === 403 && (m.fallasA11y ?? []).some((f) => f.id === "meta-refresh")) m.error = "DESAFIO";
    const n = m.notas;
    const medido = !m.error && n && [n.rendimiento, n.accesibilidad, n.practicas, n.seo].every((v) => typeof v === "number");
    if (!medido) {
        sitios.push({ ...base, estado: "sin-respuesta", motivo: motivoLegible(`${m.error ?? "sin notas"} ${m.errorRevision ?? ""}`), fecha: m.fecha ?? null });
        continue;
    }
    version ??= m.lighthouse;
    sitios.push({
        ...base,
        urlFinal: m.urlFinal ?? e.url,
        estado: "medido",
        fecha: m.fecha,
        notas: n,
        lcp: redondo(m.metricas?.["largest-contentful-paint"]),
        tbt: redondo(m.metricas?.["total-blocking-time"]),
        cls: redondo(m.metricas?.["cumulative-layout-shift"], 3),
        peso: m.pesoBytes ?? null,
        pedidos: m.pedidos ?? null,
        // Si al pedir la portada sin navegador respondió con error (bloqueo de bots, 403, 5xx), las cabeceras y el HTML
        // son los de esa página de error: los controles no cuentan.
        revision: m.revision && (m.estadoHttp ?? 200) < 400 ? m.revision : null,
        a11y: (m.fallasA11y ?? []).map((f) => [f.id, f.titulo, f.elementos]),
    });
}
fechas.sort();
const salida = {
    edicion,
    lighthouse: version,
    medidoDesde: fechas[0]?.slice(0, 10) ?? null,
    medidoHasta: fechas.at(-1)?.slice(0, 10) ?? null,
    sitios,
    excluidas,
};
process.stdout.write(JSON.stringify(salida));
console.error(`${sitios.length} sitios (${sitios.filter((s) => s.estado === "medido").length} medidos)`);
