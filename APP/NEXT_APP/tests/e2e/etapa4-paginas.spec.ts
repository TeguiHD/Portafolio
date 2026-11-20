import { expect, test } from "@playwright/test";

test.describe("Sobre mí, legales y errores con el lenguaje del sitio", () => {
    test("sobre mí: la firma de partículas arriba, el stack que la materia dibuja y nada en píldoras", async ({ page }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toContainText("Sobre mí");
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "firma");
        expect(await page.locator("#stack .sm-logos button").count()).toBeGreaterThanOrEqual(7);
        await expect(page.getByText("Quién está detrás", { exact: false })).toHaveCount(0);
        await expect(page.locator(".viva.solo-oscuro")).toHaveCount(0);
    });

    for (const [ruta, titulo, secciones] of [["/privacidad", "Privacidad", 6], ["/terminos", "Términos de uso", 5]] as const) {
        test(`${ruta}: fecha fija, índice de secciones y el correo de contacto`, async ({ page }) => {
            await page.goto(ruta);
            await expect(page.locator("h1")).toContainText(titulo);
            await expect(page.getByText("Última actualización: 18 de noviembre de 2026")).toBeVisible();
            await expect(page.getByRole("navigation", { name: "En esta página" }).getByRole("link")).toHaveCount(secciones);
            await expect(page.locator('a[href^="mailto:contacto@nicoholas.dev"]')).toHaveCount(1);
            await expect(page.locator('a[href^="mailto:hola@"]')).toHaveCount(0);
            await expect(page.getByText("IMPORTANTE", { exact: true })).toHaveCount(0);
            await expect(page.locator(".viva.solo-oscuro")).toHaveCount(0);
        });
    }

    test("el 404 lleva la barra del sitio una sola vez, sus salidas y la materia escribiendo el código", async ({ page }) => {
        for (const ruta of ["/esta-ruta-no-existe", "/herramientas/no-existe"]) {
            const r = await page.goto(ruta);
            expect(r?.status()).toBe(404);
            await expect(page.locator("header#nb")).toHaveCount(1);
            await expect(page.locator("h1")).toHaveText("Esta página no existe.");
            await expect(page.getByRole("navigation", { name: "Páginas sugeridas" }).getByRole("link")).toHaveCount(6);
            await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "texto");
        }
    });
});
