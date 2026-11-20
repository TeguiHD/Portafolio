import { expect, test } from "@playwright/test";
import { PORTADA, PORTADA_FIJA } from "./viva-utils";

// En la página de diagnóstico los titulares se pueden fijar: «ejemplo» trae tres de prueba y «ninguno» simula el blog sin datos.
const CON = `${PORTADA_FIJA}?titulares=ejemplo`, SIN = `${PORTADA_FIJA}?titulares=ninguno`;

test.describe("Materia viva: blog", () => {
    // La página de diagnóstico no existe en producción: contra una compilación, estas pruebas con titulares fijos se saltan.
    test.beforeEach(async ({ request }, info) => {
        if (info.title.startsWith("en la portada real")) return;
        test.skip((await request.get(SIN)).status() === 404, "sin página de diagnóstico (compilación de producción)");
    });

    test("en la portada real hay titulares o se dice que no los hay", async ({ page }) => {
        const errores: string[] = [];
        page.on("pageerror", (e) => errores.push(String(e)));
        await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
        const blog = page.locator("#blog");
        await expect(blog.locator('a[href="/blog"]').first()).toBeAttached();
        if (await blog.locator(".bg-linea").count()) await expect(blog.locator('.bg-linea[data-j="0"]')).toHaveCount(1);
        else await expect(blog).toContainText("Sin titulares por ahora");
        expect(errores).toEqual([]);
    });

    test("muestra un titular a la vez, con su foto y su fuente", async ({ page }) => {
        await page.goto(CON, { waitUntil: "domcontentloaded" });
        const actual = page.locator('.bg-linea[data-j="0"]');
        await expect(actual).toHaveCount(1);
        await expect(actual.locator("h3")).toHaveText("Primer titular de prueba para el tambor");
        await expect(actual.locator(".bg-meta")).toContainText("Fuente Uno");
        await expect(page.locator('.bg-foto[data-j="0"] img')).toHaveAttribute("src", /foto-1/);
        await expect(page.locator(".bg-linea h3").nth(2)).toHaveAttribute("lang", "en"); // el tercero viene en inglés
    });

    test("se recorre con el teclado, hacia adelante y hacia atrás", async ({ page }) => {
        await page.goto(CON, { waitUntil: "domcontentloaded" });
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        const escena = page.locator("#bg-escena");
        await escena.focus();
        await page.keyboard.press("ArrowDown");
        await expect(page.locator('.bg-linea[data-j="0"] h3')).toHaveText("Segundo titular de prueba, algo más largo");
        await page.keyboard.press("ArrowUp");
        await expect(page.locator('.bg-linea[data-j="0"] h3')).toHaveText("Primer titular de prueba para el tambor");
    });

    test("sin titulares, lo dice y ofrece abrir el blog", async ({ page }) => {
        const errores: string[] = [];
        page.on("pageerror", (e) => errores.push(String(e)));
        await page.goto(SIN, { waitUntil: "domcontentloaded" });
        await expect(page.locator("#blog")).toContainText("Sin titulares por ahora");
        await expect(page.locator('#blog a[href="/blog"]').first()).toBeVisible();
        await expect(page.locator(".bg-linea")).toHaveCount(0);
        expect(errores).toEqual([]);
    });
});
