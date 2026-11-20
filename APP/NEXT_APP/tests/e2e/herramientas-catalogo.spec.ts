import { expect, test } from "@playwright/test";

test.describe("Herramientas con el lenguaje del sitio", () => {
    test("el catálogo: la esfera como cabecera y las 29 en un índice por familia, sin tarjetas", async ({ page }) => {
        await page.goto("/herramientas");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toContainText("Herramientas");
        await expect(page.locator("#he-esfera .he-nodo")).toHaveCount(29);
        await expect(page.locator(".ht-grupo")).toHaveCount(6);
        await expect(page.locator(".ht-fila")).toHaveCount(29);
        await expect(page.locator(".tool-tile, .tools-catalog-search")).toHaveCount(0);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "texto");
    });

    test("en una herramienta la materia se queda en el marco, y la ruta lleva al catálogo", async ({ page }) => {
        await page.goto("/herramientas/json");
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "marco");
        const ruta = page.getByRole("navigation", { name: "Ruta de navegación" });
        await expect(ruta.getByRole("link", { name: "Herramientas" })).toHaveAttribute("href", "/herramientas");
        // Buscar y guardar quedan a la derecha de las migas.
        await expect(page.getByRole("button", { name: "Abrir navegación de herramientas" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Guardar herramienta" })).toBeVisible();
        // La barra del sitio y su pie, como en el resto de las páginas.
        await expect(page.locator("header#nb")).toHaveCount(1);
        await expect(page.locator("footer.suelo")).toHaveCount(1);
    });

    test("en tema claro el interior de las herramientas no deja cajas oscuras (fuera del código y los lienzos)", async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.setItem("tema", "claro"); } catch { /* sin almacenamiento */ } });
        for (const slug of ["json", "claves", "comprimir-imagen", "dns", "impuestos", "subredes", "unidades", "qr", "metadatos"]) {
            await page.goto(`/herramientas/${slug}`);
            await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
            await page.waitForTimeout(400);
            const oscuras = await page.evaluate(() => {
                const lum = (c: string) => { const m = c.match(/[\d.]+/g); if (!m || (m.length > 3 && Number(m[3]) < 0.5)) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
                return [...document.querySelectorAll<HTMLElement>("#tools-content *")]
                    .filter((e) => !e.closest("pre, code, canvas, svg, img, video, [data-terminal]"))
                    .filter((e) => { const r = e.getBoundingClientRect(); return r.width * r.height > 30000 && lum(getComputedStyle(e).backgroundColor) < 0.2; })
                    .map((e) => `${e.tagName}.${String(e.className).slice(0, 60)}`);
            });
            expect(oscuras, `${slug}: cajas oscuras en tema claro`).toEqual([]);
        }
    });
});

