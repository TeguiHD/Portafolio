import { expect, test } from "@playwright/test";

// La barra se prueba en la portada real.
const RUTA = "/";

test.describe("Materia viva: barra", () => {
    test("se recoge al bajar, se esconde si sigues bajando y vuelve al subir", async ({ page }) => {
        await page.goto(RUTA);
        const nb = page.locator("#nb");
        await expect(nb).not.toHaveClass(/nb-baja/);
        await page.mouse.move(700, 500);
        await page.mouse.wheel(0, 400);
        await expect(nb).toHaveClass(/nb-baja/);
        for (let k = 0; k < 8; k++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
        await expect(nb).toHaveClass(/nb-oculta/);
        await page.mouse.wheel(0, -200);
        await expect(nb).not.toHaveClass(/nb-oculta/);
    });

    test("si el foco entra a la barra escondida, vuelve a verse", async ({ page }) => {
        await page.goto(RUTA);
        const nb = page.locator("#nb");
        await page.mouse.move(700, 500);
        await page.mouse.wheel(0, 400);
        for (let k = 0; k < 8; k++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
        await expect(nb).toHaveClass(/nb-oculta/);
        await nb.locator("a").first().focus();
        await expect(nb).not.toHaveClass(/nb-oculta/);
    });

    test("marca la sección actual", async ({ page }) => {
        await page.goto(RUTA);
        const enlace = page.locator('#nb-ir a[href="#blog"]');
        await expect(enlace).not.toHaveAttribute("aria-current", /.+/);
        await page.locator("#blog").scrollIntoViewIfNeeded();
        await page.evaluate(() => document.getElementById("blog")!.scrollIntoView({ block: "center" }));
        await expect(enlace).toHaveAttribute("aria-current", "location");
    });

    test("el botón de tema cambia el tema y lo recuerda", async ({ page }) => {
        await page.goto(RUTA);
        await page.locator("#nb-tema").click();
        await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
        expect(await page.evaluate(() => localStorage.getItem("tema"))).toBe("claro");
    });

    for (const ancho of [360, 390, 768, 900, 1440]) {
        test(`cabe en ${ancho} px`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 844 });
            await page.goto(RUTA);
            await expect(page.locator("#nb")).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (ancho <= 860) {
                // Celular: arriba marca, tema y «Menú»; nada fijo abajo tapando el contenido.
                const menu = page.getByRole("button", { name: "Menú" });
                await expect(menu).toBeVisible();
                await expect(page.locator("#nb-lista a").first()).toBeHidden();
                const caja = await page.locator("#nb").boundingBox();
                expect(caja!.y).toBeLessThan(20);
                expect(caja!.height).toBeLessThan(844 * 0.12);
            } else {
                await expect(page.locator("#nb-ir a").first()).toBeVisible();
                await expect(page.getByRole("button", { name: "Menú" })).toBeHidden();
            }
        });
    }

    test("en celular «Menú» abre los destinos y se cierra al elegir uno", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(RUTA);
        const menu = page.getByRole("button", { name: "Menú" });
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        const lista = page.locator("#nb-lista");
        for (const n of ["Servicios", "Proyectos", "Herramientas", "Blog", "Sobre mí", "Hablemos de tu proyecto"]) await expect(lista.getByRole("link", { name: n })).toBeVisible();
        // Desde la portada también se llega a los servicios (es una página aparte, no una sección).
        await expect(lista.getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
        await page.keyboard.press("Escape");
        await expect(lista.getByRole("link", { name: "Blog" })).toBeHidden();
        // En la portada los destinos son secciones de la misma página: elegir una cierra el menú y baja hasta ella.
        await menu.click();
        await lista.getByRole("link", { name: "Herramientas" }).click();
        await expect(page).toHaveURL(/#herramientas$/);
        await expect(lista.getByRole("link", { name: "Herramientas" })).toBeHidden();
        // En otra página, el destino actual queda marcado.
        await page.goto("/herramientas");
        await page.getByRole("button", { name: "Menú" }).click();
        await expect(page.locator("#nb-lista").getByRole("link", { name: "Herramientas" })).toHaveAttribute("aria-current", "page");
    });
});
