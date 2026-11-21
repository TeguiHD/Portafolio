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
    for (const t of DEFAULT_TOOL_REGISTRY) {
        expect(sql, t.slug).toContain(`SET description = '${t.description.replaceAll("'", "''")}' WHERE slug = '${t.slug}';`);
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
