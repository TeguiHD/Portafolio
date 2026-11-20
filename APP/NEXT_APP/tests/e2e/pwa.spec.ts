import { expect, test, type APIRequestContext } from "@playwright/test";

/** Ancho y alto de un PNG, leídos de su cabecera (IHDR). */
async function medidas(request: APIRequestContext, ruta: string) {
    const r = await request.get(ruta);
    expect(r.ok(), `${ruta} responde`).toBe(true);
    const b = await r.body();
    expect(b.subarray(1, 4).toString(), `${ruta} es un PNG`).toBe("PNG");
    return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

interface Icono { src: string; sizes: string; type: string; purpose?: string }

test.describe("La app instalable (PWA)", () => {
    test("el manifiesto presenta el sitio con identidad estable, íconos completos, atajos y capturas", async ({ request }) => {
        const r = await request.get("/manifest.json");
        expect(r.ok()).toBe(true);
        const m = await r.json();
        // La identidad de las instalaciones que ya existen (antes se calculaba desde start_url = /blog): se conserva.
        expect(m.id).toBe("/blog");
        expect(m.name).toBe("nicoholas.dev");
        expect(m.short_name).toBe("nicoholas");
        expect(JSON.stringify(m)).not.toMatch(/Pulso/);
        for (const proposito of ["any", "maskable", "monochrome"]) {
            expect(m.icons.some((i: Icono) => i.purpose === proposito), `ícono «${proposito}»`).toBe(true);
        }
        for (const i of m.icons as Icono[]) {
            expect(i.src, "con versión, para que ninguna caché sirva el ícono viejo").toMatch(/\?v=\d+/);
            if (i.type !== "image/png") continue;
            const lado = Number(i.sizes.split("x")[0]);
            expect(await medidas(request, i.src), i.src).toEqual({ ancho: lado, alto: lado });
        }
        // Cada atajo con su propio ícono (antes los tres repetían el de la app).
        expect(new Set(m.shortcuts.map((a: { icons: Icono[] }) => a.icons[0].src)).size).toBe(m.shortcuts.length);
        for (const a of m.shortcuts) expect(await medidas(request, a.icons[0].src)).toEqual({ ancho: 96, alto: 96 });
        // Capturas para la ventana de instalación: una angosta (celular) y una ancha (computador).
        for (const forma of ["narrow", "wide"]) expect(m.screenshots.some((s: { form_factor: string }) => s.form_factor === forma), forma).toBe(true);
        for (const s of m.screenshots) expect((await request.get(s.src)).ok(), s.src).toBe(true);
    });

    test("la página enlaza el ícono nuevo de la pestaña y el de Apple (con versión: la caché no sirve el viejo)", async ({ page, request }) => {
        await page.goto("/");
        const svg = await page.locator('head link[rel="icon"][type="image/svg+xml"]').first().getAttribute("href");
        expect(svg).toMatch(/\?v=\d+/);
        const texto = await (await request.get(svg!)).text();
        expect(texto).toContain("<svg");
        expect(texto).toContain("5eead4"); // el acento de la marca
        const apple = await page.locator('head link[rel="apple-touch-icon"]').first().getAttribute("href");
        expect(apple).toMatch(/\?v=\d+/);
        expect(await medidas(request, apple!)).toEqual({ ancho: 180, alto: 180 });
        expect(await medidas(request, "/badge-72.png?v=4")).toEqual({ ancho: 72, alto: 72 });
    });

    test("sin conexión aparece la página propia del sitio, no la del panel de finanzas", async ({ request }) => {
        const html = await (await request.get("/offline.html")).text();
        expect(html).toContain("nicoholas");
        expect(html).not.toMatch(/Finanzas/i);
        expect(html).toMatch(/<html lang="es/);
    });

    test("la barra del sistema toma el color del tema claro u oscuro", async ({ page }) => {
        await page.goto("/");
        const colores = await page.locator('meta[name="theme-color"]').evaluateAll((ms) => ms.map((m) => `${m.getAttribute("media")}|${m.getAttribute("content")}`));
        expect(colores.some((c) => c.includes("dark") && c.endsWith("#08090d"))).toBe(true);
        expect(colores.some((c) => c.includes("light") && c.endsWith("#f5f4f0"))).toBe(true);
    });

    test("cuando el navegador permite instalar, aparece «Instalar la app» en el menú y en el pie; se usa una vez", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/");
        await expect(page.getByRole("button", { name: "Instalar la app" })).toHaveCount(0);
        // El navegador avisa que se puede instalar (aquí se simula su evento).
        await page.evaluate(() => {
            const e = Object.assign(new Event("beforeinstallprompt"), {
                prompt: async () => { (window as unknown as { __pidio?: boolean }).__pidio = true; },
                userChoice: Promise.resolve({ outcome: "accepted" }),
            });
            dispatchEvent(e);
        });
        await page.getByRole("button", { name: "Menú" }).click();
        const enMenu = page.locator("#nb-lista").getByRole("button", { name: "Instalar la app" });
        await expect(enMenu).toBeVisible();
        await enMenu.click();
        expect(await page.evaluate(() => (window as unknown as { __pidio?: boolean }).__pidio)).toBe(true);
        await expect(page.getByRole("button", { name: "Instalar la app" })).toHaveCount(0);
    });

    test("en iPhone se explica cómo agregarla al inicio", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
        const page = await ctx.newPage();
        await page.goto("/");
        await page.getByRole("button", { name: "Menú" }).click();
        const boton = page.locator("#nb-lista").getByRole("button", { name: "Agregar al inicio" });
        await expect(boton).toBeVisible();
        await boton.click();
        await expect(page.locator("#nb-lista")).toContainText("Agregar a inicio");
        await ctx.close();
    });
});
