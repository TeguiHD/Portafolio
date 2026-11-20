import { expect, test } from "@playwright/test";

// Las páginas públicas que llevaban la barra y el pie anteriores.
// Todas las páginas públicas comparten el esqueleto (desde la etapa 3 también /herramientas y cada herramienta).
const PAGINAS = ["/", "/blog", "/herramientas", "/herramientas/qr", "/sobre-mi", "/ar", "/privacidad", "/terminos"];

for (const ruta of PAGINAS) {
    test.describe(`Materia viva: esqueleto en ${ruta}`, () => {
        test("lleva la barra, el pie y la materia nuevos, y no los anteriores", async ({ page }) => {
            const errores: string[] = [];
            page.on("pageerror", (e) => errores.push(String(e)));
            await page.goto(ruta, { waitUntil: "domcontentloaded" });
            await expect(page.locator("header#nb")).toBeVisible();
            await expect(page.locator("footer.suelo")).toHaveCount(1);
            await expect(page.locator("canvas#materia")).toHaveCount(1);
            await expect(page.locator("[data-barra-anterior], [data-pie-anterior]")).toHaveCount(0);
            await expect(page.locator("#contenido")).toHaveCount(1);
            await expect(page.locator('a[href="#contenido"]').first()).toHaveText(/Saltar al contenido/);
            expect(errores, "errores de la página").toEqual([]);
        });

        for (const ancho of [390, 1440]) {
            test(`no se desborda en ${ancho} px`, async ({ page }) => {
                await page.setViewportSize({ width: ancho, height: 844 });
                await page.goto(ruta, { waitUntil: "domcontentloaded" });
                await expect(page.locator("header#nb")).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            });
        }
    });
}
