import { test, expect } from "@playwright/test";
import { TOOL_SEO_SLUGS } from "../../src/lib/seo/tools-content";

const SITE_URL = "https://nicoholas.dev";

// Páginas no derivadas del registro que src/app/sitemap.ts añade a mano:
// home, hub de herramientas, blog y sobre-mi (core) + privacidad y términos
// (legal). Si se agrega o quita una de estas páginas en el sitemap, este
// número debe actualizarse a mano junto con sitemap.ts; las herramientas, en
// cambio, se derivan de TOOL_SEO_SLUGS y no deben tocar este archivo nunca.
const NON_TOOL_SITEMAP_PAGES = 6;
const EXPECTED_SITEMAP_URL_COUNT = TOOL_SEO_SLUGS.length + NON_TOOL_SITEMAP_PAGES;

test.describe("Sitemap y robots", () => {
    test("el sitemap incluye las 29 herramientas", async ({ request }) => {
        const response = await request.get("/sitemap.xml");
        expect(response.status()).toBe(200);
        const xml = await response.text();

        for (const slug of TOOL_SEO_SLUGS) {
            expect(xml, `falta ${slug} en el sitemap`).toContain(
                `${SITE_URL}/herramientas/${slug}`
            );
        }
    });

    test("el sitemap incluye home, hub y legales", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        for (const path of ["", "/herramientas", "/blog", "/sobre-mi", "/privacidad", "/terminos"]) {
            expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
        }
    });

    test("el sitemap no contiene rutas privadas", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        expect(xml).not.toContain("/admin");
        expect(xml).not.toContain("/api/");
        expect(xml).not.toContain("/acceso");
    });

    test("robots.txt permite crawlers de IA y bloquea admin", async ({ request }) => {
        const response = await request.get("/robots.txt");
        expect(response.status()).toBe(200);
        const txt = await response.text();

        for (const bot of [
            "GPTBot",
            "ClaudeBot",
            "PerplexityBot",
            "Google-Extended",
            "CCBot",
            "Applebot-Extended",
        ]) {
            expect(txt, `falta regla para ${bot}`).toContain(bot);
        }

        expect(txt).toContain("Disallow: /admin/");
        expect(txt).toContain(`${SITE_URL}/sitemap.xml`);
        expect(txt).not.toContain("sitemap_index");
    });

    test("todas las URLs del sitemap responden 200", async ({ request }) => {
        // Margen amplio: esta prueba recorre 35 URLs en serie contra el
        // servidor real. `src/proxy.ts` consulta `isRedisAvailable()`
        // (`src/lib/redis.ts`) en cada request, y si Redis no está disponible
        // (checkout en frío, CI sin Redis) cada llamada repite un ciclo
        // completo de connect-with-retry en lugar de cachear el fallo. Eso
        // puede multiplicar la latencia por request y agotar el timeout por
        // defecto de Playwright sin que el sitemap tenga ningún problema real.
        test.setTimeout(120_000);

        const xml = await (await request.get("/sitemap.xml")).text();
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

        // Total exacto: 4 core (home, hub, blog, sobre-mi) + herramientas del
        // registro + 2 legales. Se deriva de TOOL_SEO_SLUGS en vez de
        // hardcodear 35 para que agregar una herramienta al registro (que
        // agrega una URL real al sitemap) no vuelva rojo este test — la
        // propiedad que este branch garantiza es justamente que el sitemap
        // sigue al registro sin ningún otro edit. Un piso (`toBeGreaterThanOrEqual`) seguiría
        // dejando pasar una regresión que infla el sitemap con URLs
        // hardcodeadas ajenas al registro, así que el exact-match se
        // mantiene, solo que contra un valor derivado.
        expect(locs.length).toBe(EXPECTED_SITEMAP_URL_COUNT);

        // Ninguna URL debe repetirse: duplicados pasarían el chequeo de
        // presencia de las 29 herramientas y seguirían devolviendo 200.
        const uniqueLocs = new Set(locs);
        expect(uniqueLocs.size, "el sitemap contiene URLs duplicadas").toBe(locs.length);

        for (const loc of locs) {
            const path = loc.replace(SITE_URL, "") || "/";
            const res = await request.get(path);
            expect(res.status(), `${path} devolvió ${res.status()}`).toBe(200);
        }
    });
});
