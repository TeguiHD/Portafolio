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

    test("en celular, los destinos del menú tienen el mismo tamaño y color", async ({ page }) => {
        // La regla de escritorio (.nb-ir .nb-item) achicaba y apagaba Servicios, Proyectos y Blog (24-11-2026).
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/sobre-mi");
        await page.getByRole("button", { name: "Menú" }).click();
        const estilos = await page.locator("#nb-lista > a:not(.boton), #nb-lista > .nb-grupo > .nb-abre").evaluateAll((els) =>
            els.filter((e) => !e.hasAttribute("aria-current")).map((e) => `${e.textContent!.trim()}: ${getComputedStyle(e).fontSize} ${getComputedStyle(e).color}`));
        expect(estilos.length).toBeGreaterThanOrEqual(5);
        expect(new Set(estilos.map((s) => s.split(": ")[1])).size, estilos.join("\n")).toBe(1);
        // «Hablemos de tu proyecto» sigue siendo el botón: centrado y con su tamaño, no un destino más.
        const cta = page.locator("#nb-lista .nb-menu-hablar");
        expect(await cta.evaluate((e) => [getComputedStyle(e).justifyContent, getComputedStyle(e).fontSize].join(" "))).toBe("center 16.5px");
    });

    test("en celular «Menú» abre los destinos y se cierra al elegir uno", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(RUTA);
        const menu = page.getByRole("button", { name: "Menú" });
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        const lista = page.locator("#nb-lista");
        for (const n of ["Servicios", "Proyectos", "Blog", "Sobre mí", "Hablemos de tu proyecto"]) await expect(lista.getByRole("link", { name: n })).toBeVisible();
        for (const n of ["Herramientas", "Índice"]) await expect(lista.getByRole("button", { name: n })).toBeVisible();
        // Desde la portada también se llega a los servicios (es una página aparte, no una sección).
        await expect(lista.getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
        // Herramientas e Índice despliegan su lista dentro del menú.
        const herr = lista.getByRole("button", { name: "Herramientas" });
        await herr.click();
        await expect(herr).toHaveAttribute("aria-expanded", "true");
        await expect(lista.getByRole("link", { name: "Ver todas las herramientas" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(lista.getByRole("link", { name: "Blog" })).toBeHidden();
        // En la portada los destinos son secciones de la misma página: elegir una cierra el menú y baja hasta ella.
        await menu.click();
        await lista.getByRole("link", { name: "Proyectos" }).click();
        await expect(page).toHaveURL(/#proyectos$/);
        await expect(lista.getByRole("link", { name: "Proyectos" })).toBeHidden();
        // En otra página, el destino actual queda marcado.
        await page.goto("/herramientas");
        await page.getByRole("button", { name: "Menú" }).click();
        await expect(page.locator("#nb-lista").getByRole("button", { name: "Herramientas" })).toHaveAttribute("aria-current", "page");
    });

    test("en ancho, «Índice» abre su panel con los rankings, el revisor y el método, y Escape lo cierra", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(RUTA);
        const boton = page.locator("#nb-ir").getByRole("button", { name: "Índice" });
        await boton.click();
        await expect(boton).toHaveAttribute("aria-expanded", "true");
        const panel = page.locator("#nb-sub-indice");
        await expect(panel.getByRole("link", { name: /Revisa tu sitio/ })).toBeVisible();
        await expect(panel.getByRole("link", { name: "Servicios locales de educación" })).toHaveAttribute("href", "/indice-web-chilena/servicios-locales-de-educacion");
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(boton).toHaveAttribute("aria-expanded", "false");
    });

    // Con la barra centrada por translate, el anclaje CSS dejaba el panel 340 px a la derecha y cortado (24-11-2026).
    for (const ancho of [1440, 1100, 900]) {
        test(`en ${ancho} px, cada panel cabe en la pantalla y queda bajo su botón`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            for (const nombre of ["Herramientas", "Índice"]) {
                const boton = page.locator("#nb-ir").getByRole("button", { name: nombre });
                await boton.click();
                const panel = page.locator(`#${await boton.getAttribute("aria-controls")}`);
                await expect(panel).toBeVisible();
                const [b, p] = [(await boton.boundingBox())!, (await panel.boundingBox())!];
                expect(p.x, `${nombre}: borde izquierdo`).toBeGreaterThanOrEqual(0);
                expect(p.x + p.width, `${nombre}: borde derecho`).toBeLessThanOrEqual(ancho);
                expect(p.y, `${nombre}: bajo la barra`).toBeGreaterThan(b.y + b.height);
                // Debajo del botón: el panel cubre al menos parte de su ancho.
                expect(Math.min(p.x + p.width, b.x + b.width) - Math.max(p.x, b.x), `${nombre}: bajo su botón`).toBeGreaterThan(0);
                await page.keyboard.press("Escape");
                await expect(panel).toBeHidden();
            }
        });
    }
});
