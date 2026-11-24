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
    // Recogida medía 680 px fijos y su contenido unos 800: «Hablemos» quedaba en 32 px («Ha») y el tema encima (24-11-2026).
    for (const ancho of [1440, 1100, 900]) {
        test(`en ${ancho} px, recogida no aplasta nada`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            await page.mouse.move(ancho / 2, 600);
            await page.mouse.wheel(0, 400);
            await expect(page.locator("#nb")).toHaveClass(/nb-baja/);
            await page.waitForTimeout(900); // la cápsula termina de recogerse
            const m = await page.evaluate(() => {
                const caja = (s: string) => document.querySelector(s)!.getBoundingClientRect();
                const h = document.querySelector<HTMLElement>("#nb-hablar")!;
                const [t, b, nb] = [caja("#nb-tema"), caja("#nb-hablar"), caja("#nb")];
                return { ancho: b.width, corta: h.scrollWidth > h.clientWidth + 1, cruce: t.right > b.left + 1, derecha: nb.right, vista: innerWidth };
            });
            expect(m.ancho, "ancho de «Hablemos»").toBeGreaterThanOrEqual(100);
            expect(m.corta, "«Hablemos» cortado").toBe(false);
            expect(m.cruce, "el tema se monta sobre «Hablemos»").toBe(false);
            expect(m.derecha, "la cápsula cabe").toBeLessThanOrEqual(m.vista - 8);
        });
    }

    test("los paneles abren con intención: rozar el botón no los abre, quedarse sí", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/herramientas");
        const panel = page.locator("#nb-sub-herramientas");
        await expect(panel).toHaveAttribute("popover", "auto"); // ya hidrató: el atributo lo pone el script
        // La barra entra bajando: se mide cuando ya llegó (si no, el botón está más arriba que al volver con el cursor).
        await page.waitForFunction(() => document.getElementById("nb")!.getAnimations({ subtree: true }).every((a) => a.playState !== "running"));
        const b = (await page.locator("#nb-ir").getByRole("button", { name: "Herramientas" }).boundingBox())!;
        const blog = (await page.locator("#nb-ir").getByRole("link", { name: "Blog" }).boundingBox())!;
        // Cruzar la barra pasando por «Herramientas»: el panel no se abre en el camino.
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(60);
        expect(await panel.isVisible(), "abierto al rozar").toBe(false);
        await page.mouse.move(blog.x + blog.width / 2, blog.y + blog.height / 2, { steps: 4 });
        await page.waitForTimeout(400);
        expect(await panel.isVisible(), "abierto después de pasar").toBe(false);
        // Quedarse encima sí lo abre.
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
        await page.waitForTimeout(400);
        await expect(panel).toBeVisible();
    });

    for (const ancho of [1440, 1100]) {
        test(`en ${ancho} px, cada herramienta del panel se describe en una línea`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            await page.locator("#nb-ir").getByRole("button", { name: "Herramientas" }).click();
            await expect(page.locator("#nb-sub-herramientas")).toBeVisible();
            const altos = await page.locator(".nb-panel-lista span").evaluateAll((s) => s.map((e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)));
            expect(altos.length).toBe(8);
            for (const a of altos) expect(a).toBeLessThanOrEqual(1.4);
        });
    }
});
