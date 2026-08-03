import { test, expect } from "@playwright/test";
import { TOOL_SEO_SLUGS } from "../../src/lib/seo/tools-content";

const SITE_URL = "https://nicoholas.dev";

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
        for (const path of ["", "/herramientas", "/blog", "/privacidad", "/terminos"]) {
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
        // Margen amplio: esta prueba recorre 34 URLs en serie contra el
        // servidor real. `src/proxy.ts` consulta `isRedisAvailable()`
        // (`src/lib/redis.ts`) en cada request, y si Redis no está disponible
        // (checkout en frío, CI sin Redis) cada llamada repite un ciclo
        // completo de connect-with-retry en lugar de cachear el fallo. Eso
        // puede multiplicar la latencia por request y agotar el timeout por
        // defecto de Playwright sin que el sitemap tenga ningún problema real.
        test.setTimeout(120_000);

        const xml = await (await request.get("/sitemap.xml")).text();
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

        // Total exacto según el Definition of Done del plan: 3 core
        // (home, hub, blog) + 29 herramientas + 2 legales = 34. Un piso
        // (`toBeGreaterThanOrEqual`) dejaría pasar una regresión que infla el
        // sitemap (p. ej. un merge que reintroduce URLs hardcodeadas junto a
        // las derivadas del registro).
        expect(locs.length).toBe(34);

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
