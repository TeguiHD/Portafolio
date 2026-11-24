/**
 * Índice de la Web Chilena, edición 2026-12: correo y suplantación. Para cada dominio propio de la lista mira, solo por
 * DNS (con dig, sin tocar el sitio):
 * - SPF: un registro TXT que empieza con «v=spf1» en el dominio;
 * - DMARC: el TXT de _dmarc.<dominio> y su política (p=none, quarantine o reject);
 * - DNSSEC: si la zona padre publica un registro DS del dominio.
 *
 * Uso: node scripts/indice/medir-dns.mjs <entidades.json> <salida.json>
 * El dominio propio sale de dominioPropio() (src/lib/indice/dimensiones.ts): gob.cl, gov.cl, mil.cl y co.cl son sufijos.
 */
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const [, , archivoEntidades, salida] = process.argv;
if (!archivoEntidades || !salida) { console.error("Uso: node scripts/indice/medir-dns.mjs <entidades.json> <salida.json>"); process.exit(1); }
const { dominioPropio } = await import("../../src/lib/indice/dimensiones.ts");
const dig = promisify(execFile);

/** Las respuestas de dig +short para un tipo; [] si no hay o si falla. Los TXT partidos en varias cadenas se unen. */
async function consultar(nombre, tipo) {
    try {
        const { stdout } = await dig("dig", ["+short", "+time=5", "+tries=2", tipo, nombre], { timeout: 30_000 });
        return stdout.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (tipo === "TXT" ? l.replace(/"\s+"/g, "").replace(/^"|"$/g, "") : l));
    } catch {
        return null;
    }
}

async function medir(dominio) {
    const [txt, dmarc, ds] = await Promise.all([consultar(dominio, "TXT"), consultar(`_dmarc.${dominio}`, "TXT"), consultar(dominio, "DS")]);
    const spf = (txt ?? []).find((t) => /^v=spf1\b/i.test(t)) ?? null;
    const registroDmarc = (dmarc ?? []).find((t) => /^v=DMARC1\b/i.test(t)) ?? null;
    const politica = registroDmarc ? (/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\b/i.exec(registroDmarc)?.[1]?.toLowerCase() ?? null) : null;
    return {
        dominio, fecha: new Date().toISOString(), error: txt === null && dmarc === null && ds === null ? "dig no respondió" : null,
        spf: !!spf, dmarc: politica, dnssec: (ds ?? []).some((l) => /^\d+\s+\d+\s+\d+\s+[0-9A-Fa-f]+/.test(l)),
    };
}

const entidades = JSON.parse(await readFile(archivoEntidades, "utf8"));
const dominios = [...new Set(entidades.filter((e) => e.url).map((e) => dominioPropio(new URL(e.url).hostname)))].sort();
const resultados = {};
for (let i = 0; i < dominios.length; i += 4) {
    const tanda = await Promise.all(dominios.slice(i, i + 4).map(medir));
    for (const r of tanda) resultados[r.dominio] = r;
    if ((i / 4) % 25 === 0) console.error(`${Math.min(i + 4, dominios.length)}/${dominios.length}`);
}
await writeFile(salida, JSON.stringify(resultados, null, 1));
console.error(`listo: ${dominios.length} dominios`);
