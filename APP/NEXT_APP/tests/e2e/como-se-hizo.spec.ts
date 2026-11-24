import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY } from "../../src/lib/tool-registry";
import { ESTUDIOS_HERRAMIENTAS } from "../../src/lib/como-se-hizo-herramientas";
import { METODO, PRUEBAS_MINIMO } from "../../src/lib/como-se-hizo";

/**
 * «Cómo se hizo» (docs/superpowers/specs/2026-11-24-como-se-hizo-design.md): cada herramienta muestra su estudio y
 * /como-se-hizo reúne el método. Las de «datos» no necesitan servidor; las de «en el sitio», sí (las fichas de productos
 * importan la edición del índice, un JSON que el cargador de las pruebas no lee: se revisan en la página).
 */
const CAMPOS = ["para", "reviso", "funciona", "comprueba"] as const;
/** Relleno con tono de IA o de venta (diseño del catálogo, 21-11-2026, y reglas del sitio). */
const VETADAS = /intuitiv|potente|perfect[oa]|ideal para|optimizad|control total|privacidad total|sin esfuerzo|revolucionari|f[áa]cil(mente)?\b|incre[íi]ble|robust[oa]|de [úu]ltima generaci[óo]n|→/i;
/** Palabras en mayúsculas sostenidas: solo siglas conocidas. */
const SIGLAS = new Set(["ASCII", "EXIF", "JSON", "HTML", "HTTPS", "HTTP", "DMARC", "DNSSEC", "SVG", "PNG", "JPEG", "WEBP", "AVIF", "UTF", "CIDR", "VLSM", "IPV4", "IPV6", "SHA", "HMAC", "UUID", "RFC", "NIST", "OWASP", "IANA", "WHATWG", "AFP", "UF", "UTM", "IVA", "RUT", "SII", "LIR", "BCN", "API", "ECMA", "ISO", "IEC", "LSB", "MIME", "CMYK", "RGBA", "HSL", "URL", "URLS", "CSV", "SIES", "PNGS", "JWT", "JWTS", "DNS", "TXT", "SPF", "DKIM", "MX", "QR", "ICO", "GIF", "BMP", "TIFF", "HEIC", "WASM", "ONNX", "SINIM", "LCP", "AA",
    "JPG", "ZIP", "KB", "HD", "HEX", "RGB", "CSS", "MECARD", "BIP", "README", "ITU", "BT", "UTC", "BIPM", "UAI", "DL", "EE", "UU",
    "GPS", "CIPA", "DC", "XMP", "SP", "SSH", "MITRE", "ATT", "CK", "IP", "IPV", "TCP", "UDP", "AES", "RSA", "ECDSA", "HS", "RS", "PS", "ES",
    "IA", "AI", "MB", "GB", "UAX", "UTS", "CVE", "NVD", "VLSM", "TC", "WPA3", "SOA", "NS", "PTR", "CAA", "AAAA", "CNAME", "TTL", "HSTS", "TLS", "SSL", "PEM", "SPA", "URI", "ASN", "DOM", "WPA", "WEP", "OAuth", "IETF",
    /* marcas y nombres propios */ "TQRCG", "IS", "AFP", "UF", "SII", "BCN"]);
const textos = () => [
    ...Object.entries(ESTUDIOS_HERRAMIENTAS).flatMap(([slug, e]) => CAMPOS.map((c) => [`${slug}.${c}`, e[c]] as const)),
    ...METODO.flatMap((m) => [[`metodo.${m.paso}`, `${m.texto} ${m.ejemplo}`] as const]),
];

function problemas(donde: string, t: string): string[] {
    const malos: string[] = [];
    if (VETADAS.test(t)) malos.push(`${donde}: «${t.match(VETADAS)![0]}»`);
    if (/\p{Extended_Pictographic}/u.test(t)) malos.push(`${donde}: emoji`);
    for (const [p] of t.matchAll(/\b[A-ZÁÉÍÓÚÑ]{2,}[0-9]*\b/g)) if (!SIGLAS.has(p) && !SIGLAS.has(p.replace(/[0-9]+$/, ""))) malos.push(`${donde}: «${p}»`);
    return malos;
}

test.describe("datos", () => {
    test("cada herramienta del catálogo tiene su estudio, con las cuatro filas escritas", () => {
        const sin = DEFAULT_TOOL_REGISTRY.filter((t) => !ESTUDIOS_HERRAMIENTAS[t.slug]).map((t) => t.slug);
        expect(sin, "herramientas sin «Cómo se hizo»").toEqual([]);
        for (const [slug, e] of Object.entries(ESTUDIOS_HERRAMIENTAS)) {
            expect(DEFAULT_TOOL_REGISTRY.some((t) => t.slug === slug), `${slug} no está en el catálogo`).toBe(true);
            for (const c of CAMPOS) expect(e[c].trim().length, `${slug}.${c}`).toBeGreaterThan(20);
        }
    });

    test("sin relleno, sin «→», sin emojis y sin mayúsculas sostenidas que no sean siglas", () => {
        expect(textos().flatMap(([donde, t]) => problemas(donde, t))).toEqual([]);
    });

    test("corto: ninguna fila pasa de 60 palabras", () => {
        const largas = textos().filter(([, t]) => t.split(/\s+/).length > 60).map(([d, t]) => `${d} (${t.split(/\s+/).length})`);
        expect(largas).toEqual([]);
    });

    test("las fuentes son direcciones https, sin repetir en una misma ficha", () => {
        for (const [donde, fuentes] of Object.entries(ESTUDIOS_HERRAMIENTAS).map(([slug, e]) => [slug, e.fuentes] as const)) {
            for (const f of fuentes) {
                expect(new URL(f.url).protocol, `${donde}: ${f.url}`).toBe("https:");
                expect(f.nombre.trim().length, `${donde}: nombre de ${f.url}`).toBeGreaterThan(3);
            }
            expect(new Set(fuentes.map((f) => f.url)).size, donde).toBe(fuentes.length);
        }
    });

    test(`«más de ${PRUEBAS_MINIMO} pruebas» sigue siendo cierto`, () => {
        // Cada test( escrito cuenta una vez, aunque corra en un ciclo: el número real es mayor.
        const dir = join(process.cwd(), "tests", "e2e");
        const total = readdirSync(dir).filter((f) => f.endsWith(".spec.ts"))
            .reduce((n, f) => n + [...readFileSync(join(dir, f), "utf8").matchAll(/^\s*test\(/gm)].length, 0);
        expect(total).toBeGreaterThan(PRUEBAS_MINIMO);
    });
});

test.describe("en el sitio", () => {
    test("una herramienta muestra «Cómo se hizo» en el HTML del servidor, antes de la guía", async ({ request }) => {
        const html = await (await request.get("/herramientas/sueldo-liquido")).text();
        const estudio = html.indexOf('id="como-se-hizo"'), guia = html.indexOf("Guía de uso y preguntas frecuentes");
        expect(estudio).toBeGreaterThan(0);
        expect(guia).toBeGreaterThan(estudio);
        for (const fila of ["Para qué", "Qué se revisó", "Cómo funciona", "Cómo se comprueba"]) expect(html).toContain(`<dt>${fila}</dt>`);
    });

    test("se ve debajo de la herramienta, con sus filas y el enlace al método", async ({ page }) => {
        await page.goto("/herramientas/qr");
        const s = page.locator("#como-se-hizo");
        await expect(s.getByRole("heading", { level: 2, name: "Cómo se hizo" })).toBeVisible();
        await expect(s.locator("dl > div")).toHaveCount(ESTUDIOS_HERRAMIENTAS.qr!.fuentes.length ? 5 : 4);
        await s.getByRole("link", { name: "Cómo se hace todo el sitio" }).click();
        await expect(page).toHaveURL(/\/como-se-hizo$/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cómo se hizo.");
    });

    test("/como-se-hizo: el método en cuatro pasos, una ficha por producto y el estudio de cada herramienta", async ({ page }) => {
        await page.goto("/como-se-hizo");
        await expect(page.locator(".cs-metodo > li")).toHaveCount(METODO.length);
        // Índice, herramientas, servicios y el sitio.
        await expect(page.locator(".cs-ficha")).toHaveCount(4);
        expect(problemas("/como-se-hizo", await page.locator("main").innerText())).toEqual([]);
        // Las públicas del catálogo (el panel puede ocultar alguna): cada enlace va al estudio de una herramienta que existe.
        const hrefs = await page.locator(".cs-herramientas a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
        expect(hrefs.length).toBeGreaterThan(25);
        const slugs = new Set(DEFAULT_TOOL_REGISTRY.map((t) => t.slug));
        for (const href of hrefs) {
            expect(href).toMatch(/^\/herramientas\/[a-z0-9-]+#como-se-hizo$/);
            expect(slugs.has(href.split("/")[2]!.split("#")[0]!), href).toBe(true);
        }
    });

    test("se llega desde el pie, el sitemap, llms.txt y Sobre mí", async ({ page, request }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator("footer").getByRole("link", { name: "Cómo se hizo" })).toHaveAttribute("href", "/como-se-hizo");
        await expect(page.locator("main").getByRole("link", { name: "cómo se hizo cada parte" })).toHaveAttribute("href", "/como-se-hizo");
        expect(await (await request.get("/sitemap.xml")).text()).toContain("https://nicoholas.dev/como-se-hizo</loc>");
        expect(await (await request.get("/llms.txt")).text()).toContain("https://nicoholas.dev/como-se-hizo");
    });
});
