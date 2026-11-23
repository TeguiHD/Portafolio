/**
 * Índice de la Web Chilena: mide la portada de cada entidad con Lighthouse (emulación de celular, la de PageSpeed Insights).
 *
 * Uso:
 *   LH_DIR=<carpeta node_modules con lighthouse@13.4.1 y chrome-launcher> CHROME_PATH=<chrome> \
 *     node scripts/indice/medir.mjs <entidades.json> <carpeta-salida> [slug…]
 *
 * Un sitio a la vez (medir en paralelo ensucia el rendimiento). Por cada entidad deja <salida>/<slug>.json con lo que el
 * índice publica (notas, métricas, controles de seguridad y las fallas de accesibilidad), no el informe completo.
 * Si ya existe el archivo, la salta: se puede cortar y retomar. Si Lighthouse falla, reintenta una vez.
 * PARTE=k/n reparte la lista en n turnos, para medir en paralelo en núcleos separados.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [, , archivoEntidades, salida, ...soloSlugs] = process.argv;
if (!archivoEntidades || !salida || !process.env.LH_DIR) {
    console.error("Uso: LH_DIR=… CHROME_PATH=… node scripts/indice/medir.mjs <entidades.json> <salida> [slug…]");
    process.exit(1);
}
const { default: lighthouse } = await import(join(process.env.LH_DIR, "lighthouse/core/index.js"));
const chromeLauncher = await import(join(process.env.LH_DIR, "chrome-launcher/dist/index.js"));

const { revisarCabeceras, revisarHtml } = await import("../../src/lib/indice/revision.ts");
const UA = "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const METRICAS = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"];

const existe = (p) => access(p).then(() => true, () => false);
const nota = (c) => (c && typeof c.score === "number" ? Math.round(c.score * 100) : null);

/**
 * La revisión propia (la misma del revisor público): pide la portada sin ejecutar JavaScript, lee cabeceras y HTML,
 * y prueba si la versión HTTP lleva a la HTTPS. Si HTTP no responde, no hay versión sin cifrar: aprueba.
 */
async function revisar(url) {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const html = (await r.text()).slice(0, 3_000_000);
    const cab = revisarCabeceras(r.headers, r.url);
    let redireccion = false, actual = `http://${new URL(r.url).host}/`;
    try {
        for (let salto = 0; salto <= 5; salto++) {
            const h = await fetch(actual, { headers: { "user-agent": UA }, redirect: "manual", signal: AbortSignal.timeout(10_000) });
            const destino = h.status >= 300 && h.status < 400 ? h.headers.get("location") : null;
            if (!destino) break;
            actual = new URL(destino, actual).href;
            if (actual.startsWith("https://")) { redireccion = true; break; }
        }
    } catch (err) {
        // HTTP no responde (conexión rechazada o sin respuesta): no hay versión sin cifrar, aprueba.
        const code = err?.cause?.code ?? err?.name;
        redireccion = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "TimeoutError", "AbortError", "EHOSTUNREACH", "UND_ERR_SOCKET"].includes(code);
    }
    return { urlFinal: r.url, estado: r.status, pesoHtml: html.length, revision: { ...cab, redireccion, ...revisarHtml(html) } };
}

async function medirUna(url) {
    const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
    try {
        const r = await lighthouse(url, {
            port: chrome.port, output: "json", logLevel: "error",
            onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
            maxWaitForLoad: 45_000, locale: "es",
        });
        return r?.lhr;
    } finally {
        await chrome.kill();
    }
}

function resumir(e, lhr, ms, rev) {
    const a = lhr.audits, c = lhr.categories;
    const pesoBytes = a["total-byte-weight"]?.numericValue ?? null;
    const pedidos = a["network-requests"]?.details?.items?.length ?? null;
    // Fallas de accesibilidad: las auditorías con puntaje 0 de la categoría, con cuántos elementos afectan.
    const a11yIds = (c.accessibility?.auditRefs ?? []).filter((r) => r.weight > 0).map((r) => r.id);
    const fallasA11y = a11yIds.filter((id) => a[id]?.score === 0).map((id) => ({ id, titulo: a[id].title, elementos: a[id].details?.items?.length ?? 0 }));
    return {
        slug: e.slug, url: e.url, urlFinal: lhr.finalDisplayedUrl ?? lhr.finalUrl, fecha: lhr.fetchTime, lighthouse: lhr.lighthouseVersion,
        duracionMs: ms, error: lhr.runtimeError?.code ?? null, avisos: lhr.runWarnings ?? [],
        notas: { rendimiento: nota(c.performance), accesibilidad: nota(c.accessibility), practicas: nota(c["best-practices"]), seo: nota(c.seo) },
        metricas: Object.fromEntries(METRICAS.map((id) => [id, a[id]?.numericValue ?? null])),
        pesoBytes, pedidos,
        revision: rev?.revision ?? null, estadoHttp: rev?.estado ?? null, pesoHtml: rev?.pesoHtml ?? null, errorRevision: rev?.error ?? null,
        fallasA11y,
        benchmark: lhr.environment?.benchmarkIndex ?? null,
    };
}

const entidades = JSON.parse(await readFile(archivoEntidades, "utf8"));
await mkdir(salida, { recursive: true });

// SOLO_REVISION=1 con slugs: repite solo la revisión propia (cabeceras y HTML) y la guarda en la medición existente.
// Para los sitios cuya revisión falló por la conexión (cadena de certificados incompleta que Chrome sí acepta, socket
// cortado): se corre con NODE_TLS_REJECT_UNAUTHORIZED=0, porque lo que se revisa son las cabeceras, no el certificado.
if (process.env.SOLO_REVISION && soloSlugs.length) {
    for (const slug of soloSlugs) {
        const e = entidades.find((x) => x.slug === slug), destino = join(salida, `${slug}.json`);
        if (!e || !(await existe(destino))) { console.log(`${slug}: sin medición previa`); continue; }
        const m = JSON.parse(await readFile(destino, "utf8"));
        const rev = await revisar(e.url).catch((err) => ({ error: String(err?.cause?.code ?? err?.message ?? err).slice(0, 200) }));
        Object.assign(m, { revision: rev.revision ?? null, estadoHttp: rev.estado ?? null, pesoHtml: rev.pesoHtml ?? null, errorRevision: rev.error ?? null, revisionRepetida: new Date().toISOString() });
        await writeFile(destino, JSON.stringify(m, null, 1));
        console.log(`${slug}: ${rev.error ?? `http ${rev.estado}`}`);
    }
    process.exit(0);
}

// Sin slugs explícitos, este proceso solo reparte: mide cada sitio en un proceso Node nuevo. Lighthouse dentro de un
// mismo proceso acumula memoria de corrida en corrida (a los ~24 sitios se caía por falta de memoria, 22-11-2026).
if (!soloSlugs.length) {
    const [k, n] = (process.env.PARTE ?? "0/1").split("/").map(Number);
    const turno = entidades.filter((_, i) => i % n === k);
    let i = 0;
    for (const e of turno) {
        i++;
        if (await existe(join(salida, `${e.slug}.json`))) continue;
        let linea = "";
        // Si el proceso hijo muere sin dejar archivo (Chrome se cae o el sitio cuelga más de 4 minutos), se intenta otra
        // vez; si vuelve a fallar, queda anotado como error: en el índice aparece «sin respuesta», no desaparece.
        for (let intento = 1; intento <= 2; intento++) {
            const r = spawnSync(process.execPath, ["--max-old-space-size=1024", fileURLToPath(import.meta.url), archivoEntidades, salida, e.slug], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 240_000 });
            linea = (r.stdout ?? "").split("\n").find((l) => l.startsWith("[")) ?? `${e.slug}: sin salida (${r.signal ?? r.status}) ${(r.stderr ?? "").split("\n").find((l) => /Error/.test(l))?.trim().slice(0, 120) ?? ""}`;
            if (await existe(join(salida, `${e.slug}.json`))) break;
            if (intento === 2) {
                const motivo = r.signal === "SIGTERM" ? "el sitio no terminó de cargar en 4 minutos" : "el navegador se cerró al medirlo";
                await writeFile(join(salida, `${e.slug}.json`), JSON.stringify({ slug: e.slug, url: e.url, fecha: new Date().toISOString(), error: motivo }, null, 1));
            }
        }
        console.log(`(${i}/${turno.length}) ${linea}`);
    }
    console.log("listo");
    process.exit(0);
}
const lista = entidades.filter((e) => soloSlugs.includes(e.slug));
let hechas = 0;
for (const e of lista) {
    const destino = join(salida, `${e.slug}.json`);
    hechas++;
    if (await existe(destino)) continue;
    let resultado = null;
    for (let intento = 1; intento <= 2 && !resultado; intento++) {
        const t0 = Date.now();
        try {
            const lhr = await medirUna(e.url);
            if (!lhr) throw new Error("sin resultado");
            const ms = Date.now() - t0;
            const rev = await revisar(e.url).catch((err) => ({ error: String(err?.cause?.code ?? err?.message ?? err).slice(0, 200) }));
            const r = resumir(e, lhr, ms, rev);
            // Un error de carga (sin FCP, DNS, certificado) se reintenta una vez; si persiste, queda registrado tal cual.
            if (r.error && intento === 1) { console.log(`  ${e.slug}: ${r.error}, reintento`); continue; }
            resultado = r;
        } catch (err) {
            if (intento === 2) resultado = { slug: e.slug, url: e.url, fecha: new Date().toISOString(), error: String(err?.message ?? err).slice(0, 300) };
            else console.log(`  ${e.slug}: ${String(err?.message ?? err).slice(0, 120)}, reintento`);
        }
    }
    await writeFile(destino, JSON.stringify(resultado, null, 1));
    const n = resultado.notas;
    console.log(`[${hechas}/${lista.length}] ${e.slug} ${resultado.error ?? ""} ${n ? `${n.rendimiento}/${n.accesibilidad}/${n.practicas}/${n.seo}` : ""} ${resultado.duracionMs ?? ""}ms`);
}
console.log("listo");
