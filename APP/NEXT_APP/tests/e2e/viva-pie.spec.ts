import { expect, test } from "@playwright/test";

const RUTA = "/";

test.describe("Materia viva: pie", () => {
    test("muestra la hora de Santiago y si es de día o de noche", async ({ page }) => {
        await page.clock.install({ time: new Date("2026-11-17T15:30:00Z") }); // 12:30 en Santiago (UTC−3)
        await page.goto(RUTA);
        await expect(page.locator("#hora")).toHaveText("12:30");
        await expect(page.locator("#sl-momento")).toHaveText("De día en Santiago de Chile");
        await page.clock.setFixedTime(new Date("2026-11-18T03:10:00Z")); // 00:10 en Santiago
        await page.clock.runFor(25_000);
        await expect(page.locator("#hora")).toHaveText("00:10");
        await expect(page.locator("#sl-momento")).toHaveText("De noche en Santiago de Chile");
    });

    test("enlaza a las páginas reales del sitio", async ({ page }) => {
        await page.goto(RUTA);
        const destinos = await page.locator("footer.suelo nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
        expect(destinos).toEqual(["/servicios", "/#proyectos", "/herramientas", "/blog", "/indice-web-chilena", "/como-se-hizo", "/sobre-mi", "/cotizacion", "/privacidad", "/terminos"]);
    });

    test("el anillo lleva de vuelta arriba", async ({ page }) => {
        await page.goto(RUTA);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.locator(".sl-subir").click();
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    });
});
