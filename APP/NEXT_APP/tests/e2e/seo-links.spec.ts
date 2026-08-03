import { test, expect } from "@playwright/test";

test.describe("Enlaces y 404", () => {
    test("una URL inexistente devuelve 404 con enlaces de salida", async ({ page }) => {
        const response = await page.goto("/esta-ruta-no-existe-jamas");
        expect(response?.status()).toBe(404);

        // Debe ofrecer rutas de recuperación, no ser un callejón sin salida.
        const links = page.locator("main a, body a");
        expect(await links.count()).toBeGreaterThanOrEqual(4);
        await expect(page.locator('a[href="/herramientas"]')).toBeVisible();
    });

    test("una herramienta inexistente devuelve 404", async ({ page }) => {
        const response = await page.goto("/herramientas/no-existe");
        expect(response?.status()).toBe(404);
    });

    test("los enlaces internos del hub de herramientas responden 200", async ({
        page,
        request,
    }) => {
        // Margen amplio: este test recorre 20+ URLs en serie contra el
        // servidor real. `src/proxy.ts` consulta `isRedisAvailable()` en
        // cada request, y sin Redis disponible cada llamada repite un ciclo
        // completo de connect-with-retry, multiplicando la latencia por
        // request (mismo problema documentado en seo-crawl.spec.ts).
        test.setTimeout(120_000);

        await page.goto("/herramientas");
        const hrefs = await page
            .locator('a[href^="/herramientas/"]')
            .evaluateAll((els) =>
                Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute("href")!)))
            );

        expect(hrefs.length).toBeGreaterThanOrEqual(20);
        for (const href of hrefs) {
            const res = await request.get(href);
            expect(res.status(), `${href} devolvió ${res.status()}`).toBe(200);
        }
    });
});
