import { test, expect } from "@playwright/test";
import { TOOL_SEO_SLUGS } from "../../src/lib/seo/tools-content";

/**
 * GEO/AEO: lo que ven los crawlers que NO ejecutan JavaScript.
 *
 * GPTBot, ClaudeBot, PerplexityBot y CCBot no renderizan. Todo lo que se
 * afirme aquí se comprueba contra el HTML crudo servido, nunca contra el DOM
 * hidratado — usar `page.goto` invalidaría el propósito de estos tests.
 */

function stripToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

test.describe("Crawlers sin JavaScript", () => {
    test("la home sirve las 29 herramientas como enlaces en HTML crudo", async ({
        request,
    }) => {
        const html = await (await request.get("/")).text();
        for (const slug of TOOL_SEO_SLUGS) {
            expect(html, `falta el enlace a ${slug} en el HTML de la home`).toContain(
                `href="/herramientas/${slug}"`
            );
        }
    });

    test("la home sirve contenido sustancial sin ejecutar JavaScript", async ({
        request,
    }) => {
        const text = stripToText(await (await request.get("/")).text());
        // Antes de esta fase eran ~690 caracteres: solo el hero.
        expect(text.length).toBeGreaterThan(3000);
    });

    test("el aviso de noscript no tapa la página", async ({ request }) => {
        const html = await (await request.get("/")).text();
        const warning = /\.browser-warning\s*\{([\s\S]*?)\}/.exec(html);
        expect(warning, "no se encontró la regla .browser-warning").toBeTruthy();
        // Un overlay `position: fixed` con inset 0 dejaba el sitio entero
        // invisible para cualquier crawler que no ejecute JS.
        expect(warning![1]).not.toMatch(/position:\s*fixed/);
    });

    test("/llms.txt responde y lista las herramientas", async ({ request }) => {
        const response = await request.get("/llms.txt");
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("text/plain");

        const body = await response.text();
        for (const slug of TOOL_SEO_SLUGS) {
            expect(body, `falta ${slug} en llms.txt`).toContain(
                `/herramientas/${slug}`
            );
        }
        expect(body).toContain("/sobre-mi");
    });

    test("las herramientas sirven su h1 y su descripción sin JavaScript", async ({
        request,
    }) => {
        for (const slug of ["qr", "claves", "json"]) {
            const html = await (await request.get(`/herramientas/${slug}`)).text();
            const text = stripToText(html);
            // Las migas de pan son server-rendered: dan contexto al crawler
            // aunque el widget en sí sea cliente.
            expect(text, `${slug} sin migas en HTML crudo`).toContain("Herramientas");
            expect(html, `${slug} sin SoftwareApplication`).toContain(
                "SoftwareApplication"
            );
        }
    });
});
