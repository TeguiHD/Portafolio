import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY, getDefaultPublicToolCatalog } from "../../src/lib/tool-registry";
import { AGENTES_AUTOMATIZADOS, DESTACADAS_RESPALDO, elegirDestacadas, esNueva, relacionadasDe } from "../../src/lib/tool-destacadas";
import { claveUsoIp } from "../../src/lib/ip-uso";

/** Datos del catálogo de /herramientas: relacionadas, destacadas y «Nueva». Sin navegador. */
const todas = getDefaultPublicToolCatalog().map((t) => t.slug);

test("cada herramienta tiene 3 relacionadas reales, distintas y que no son ella misma", () => {
    const slugs = new Set(DEFAULT_TOOL_REGISTRY.map((t) => t.slug));
    for (const t of DEFAULT_TOOL_REGISTRY) {
        expect(t.relacionadas, t.slug).toHaveLength(3);
        expect(new Set(t.relacionadas).size, t.slug).toBe(3);
        expect(t.relacionadas, t.slug).not.toContain(t.slug);
        for (const r of t.relacionadas) expect(slugs.has(r), `${t.slug} → ${r}`).toBe(true);
    }
});

test("sin datos suficientes: orden de respaldo y sin rótulo de uso", () => {
    expect(elegirDestacadas([], todas)).toEqual({ slugs: [...DESTACADAS_RESPALDO], porUso: false });
    expect(elegirDestacadas([{ slug: "json", sesiones: 4 }], todas).porUso).toBe(false);
    expect(elegirDestacadas([{ slug: "json", sesiones: 4 }], todas).slugs).toEqual([...DESTACADAS_RESPALDO]);
});

test("con datos: manda el uso y el respaldo llena los huecos sin repetir", () => {
    const r = elegirDestacadas([{ slug: "dns", sesiones: 9 }, { slug: "qr", sesiones: 7 }], todas);
    expect(r.slugs.slice(0, 2)).toEqual(["dns", "qr"]);
    expect(r.slugs).toHaveLength(6);
    expect(new Set(r.slugs).size).toBe(6);
    expect(r.porUso).toBe(false);
});

test("las 6 por datos: rótulo de uso", () => {
    const seis = ["dns", "qr", "json", "jwt", "regex", "base64"].map((slug, i) => ({ slug, sesiones: 20 - i }));
    expect(elegirDestacadas(seis, todas)).toEqual({ slugs: seis.map((s) => s.slug), porUso: true });
});

test("una herramienta oculta en el panel no sale en destacadas ni en relacionadas", () => {
    const sinQr = todas.filter((s) => s !== "qr");
    expect(elegirDestacadas([], sinQr).slugs).not.toContain("qr");
    expect(elegirDestacadas([], sinQr).slugs).toHaveLength(6);
    expect(elegirDestacadas([{ slug: "qr", sesiones: 50 }], sinQr).slugs).not.toContain("qr");
    expect(relacionadasDe("enlaces", sinQr)).not.toContain("qr");
    expect(relacionadasDe("enlaces", todas)).toEqual(["qr", "base64", "aleatorio"]);
});

test("«Nueva» solo dentro de 60 días", () => {
    const hoy = new Date("2026-11-21");
    expect(esNueva("2026-10-01", hoy)).toBe(true);
    expect(esNueva("2026-09-01", hoy)).toBe(false);
    expect(esNueva(undefined, hoy)).toBe(false);
});

const VETADAS = ["intuitiv", "control total", "perfecto para", "ideal para", "optimizado", "privacidad total", "sin marcas de agua", "descarga gratuita"];

test("las descripciones dicen qué hace cada herramienta, sin relleno", () => {
    for (const t of DEFAULT_TOOL_REGISTRY) {
        for (const v of VETADAS) expect(t.description.toLowerCase(), `${t.slug}: «${v}»`).not.toContain(v);
        expect(t.description.length, t.slug).toBeLessThanOrEqual(110);
    }
});

test("la migración trae la descripción de cada herramienta, igual a la del registro", () => {
    const sql = readFileSync("prisma/migrations/20261121120000_descripciones_herramientas/migration.sql", "utf8");
    // Las chilenas (22-11-2026) llegan con su descripción en la migración que las crea.
    const nuevas = readFileSync("prisma/migrations/20261122130000_herramientas_chile/migration.sql", "utf8");
    for (const t of DEFAULT_TOOL_REGISTRY) {
        const d = t.description.replaceAll("'", "''");
        if (t.category === "chile") expect(nuevas, t.slug).toMatch(new RegExp(`'${t.slug}', '${t.name}', '${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
        else expect(sql, t.slug).toContain(`SET description = '${d}' WHERE slug = '${t.slug}';`);
    }
});

test("el seed toma las herramientas del registro: no puede devolver las descripciones viejas", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    expect(seed).toContain("DEFAULT_TOOL_SEEDS");
    expect(seed).not.toContain("Optimizado para web");
    expect(seed).not.toContain("descarga gratuita");
});

test("una IPv6 cuenta por su prefijo /64: las direcciones temporales de una misma casa son una persona", () => {
    expect(claveUsoIp("2800:150:1:2:aaaa:bbbb:cccc:dddd")).toBe(claveUsoIp("2800:150:1:2:1111:2222:3333:4444"));
    expect(claveUsoIp("2800:150:1:2:aaaa::1")).toBe("2800:150:1:2");
    expect(claveUsoIp("2800:150::1")).toBe("2800:150:0:0");
    expect(claveUsoIp("2800:150:1:3::1")).not.toBe(claveUsoIp("2800:150:1:2::1"));
    expect(claveUsoIp("190.22.1.9")).toBe("190.22.1.9");
});

test("el ranking deja fuera navegadores automatizados, robots y clientes de línea de comandos", () => {
    const re = new RegExp(AGENTES_AUTOMATIZADOS, "i");
    for (const ua of ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0 Safari/537.36",
        "Googlebot/2.1", "curl/8.6.0", "python-requests/2.32", "Wget/1.21", "Go-http-client/2.0", "unknown", ""]) {
        expect(re.test(ua) || ua === "", ua).toBe(true);
    }
    expect(re.test("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36")).toBe(false);
    expect(re.test("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe(false);
});

/* Ronda 2: ancho de cada herramienta y nombres en español correcto. */
const ANCHAS = ["qr", "ascii", "quitar-fondo", "comprimir-imagen", "convertir-imagen", "redimensionar", "recortar-imagen", "marca-agua", "favicon", "convertir-ico", "paleta-colores", "base64", "dns", "nginx", "json", "regex", "aleatorio", "sueldo-liquido"];
const SIGLAS = new Set(["QR", "IVA", "JSON", "JWT", "DNS", "EXIF", "ASCII", "ICO", "PNG", "IPv4", "IPv6", "Base64", "Nginx", "RUT", "UF", "UTM"]);
/** Los nombres de fábrica que cambian (la migración solo los toca si nadie los editó en el panel). */
const ANTES: Record<string, string> = {
    "convertir-imagen": "Conversor de Imágenes", "recortar-imagen": "Recortador de Imágenes", "quitar-fondo": "Quitar Fondo",
    "comprimir-imagen": "Compresor de Imágenes", redimensionar: "Redimensionar Imágenes", "paleta-colores": "Extractor de Paleta",
    "marca-agua": "Marca de Agua", favicon: "Generador de Favicons", claves: "Generador de Contraseñas", ascii: "Generador ASCII Art",
    enlaces: "Generador de Links", aleatorio: "Sorteos y Ruleta", unidades: "Conversor de Unidades", binario: "Traductor Binario",
    regex: "Regex Tester", esteganografia: "Esteganografía Emoji", "esteganografia-imagen": "Esteganografía en Imágenes",
    metadatos: "Extractor de Metadatos EXIF", "reverse-shell": "Generador de Reverse Shells", "banner-ascii": "Generador de Banners ASCII",
    subredes: "Calculadora de Subredes",
};
const enEspanol = (nombre: string) => nombre.split(/\s+/).slice(1).map((p) => p.replace(/[,.;:]$/, "")).filter((p) => /^\p{Lu}/u.test(p) && !SIGLAS.has(p));

test("cada herramienta dice su ancho: anchas las de estudio y dos paneles, estrechas las de formulario", () => {
    for (const t of DEFAULT_TOOL_REGISTRY) expect(t.ancho, t.slug).toBe(ANCHAS.includes(t.slug) ? "ancha" : "estrecha");
});

test("los nombres van con mayúscula solo al inicio y en siglas (también los del contenido SEO)", async () => {
    const { TOOLS_SEO } = await import("../../src/lib/seo/tools-content");
    for (const t of DEFAULT_TOOL_REGISTRY) expect(enEspanol(t.name), t.name).toEqual([]);
    for (const [slug, s] of Object.entries(TOOLS_SEO)) expect(enEspanol(s.h1), `${slug}: ${s.h1}`).toEqual([]);
});

test("la migración renombra en la base solo lo que sigue con el nombre de fábrica", () => {
    const sql = readFileSync("prisma/migrations/20261121130000_nombres_herramientas/migration.sql", "utf8");
    for (const [slug, viejo] of Object.entries(ANTES)) {
        const nuevo = DEFAULT_TOOL_REGISTRY.find((t) => t.slug === slug)!.name;
        expect(nuevo, slug).not.toBe(viejo);
        expect(sql, slug).toContain(`UPDATE "Tool" SET name = '${nuevo}' WHERE slug = '${slug}' AND name = '${viejo}';`);
    }
});
