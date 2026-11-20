import { expect, test, type Page } from "@playwright/test";
import { PORTADA } from "./viva-utils";

const escena = (page: Page) => page.locator("#pr-escena");
const alCentro = (page: Page, sel: string) => page.evaluate((s) => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(s)!.scrollIntoView({ block: "center" });
}, sel);

test.describe("Materia viva: proyectos", () => {
    test("la captura se arma cuando el marco se ve, y se repite al volver", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        await alCentro(page, "#pr-escena");
        await expect(escena(page)).not.toHaveClass(/pr-lista/); // primero la materia
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "imagen");
        await expect(escena(page)).toHaveClass(/pr-lista/, { timeout: 6000 });
        await page.evaluate(() => scrollTo(0, 0));
        await expect(escena(page)).not.toHaveClass(/pr-lista/);
        await alCentro(page, "#pr-escena");
        await expect(escena(page)).toHaveClass(/pr-lista/, { timeout: 6000 });
    });

    test("si la captura no carga, el marco no queda esperando", async ({ page }) => {
        const errores: string[] = [];
        page.on("pageerror", (e) => errores.push(String(e)));
        await page.route("**/images/projects/viva/**", (r) => r.abort());
        await page.goto(PORTADA);
        await alCentro(page, "#pr-escena");
        await expect(escena(page)).toHaveClass(/pr-lista/, { timeout: 6000 });
        await expect(page.locator("#pr-foto")).toHaveAttribute("alt", /Captura real de FloresDyD/);
        expect(errores).toEqual([]);
    });

    test("el proyecto privado muestra su esquema, no una pantalla", async ({ page }) => {
        await page.goto(PORTADA);
        await alCentro(page, "#pr-escena");
        await page.getByRole("tab", { name: "Intranet OTEC" }).click();
        await expect(page.locator("#pr-foto")).toHaveAttribute("alt", /^Esquema del alcance/);
        await expect(escena(page)).toHaveClass(/pr-sin-fono/);
        await expect(page.locator("#pr-ir")).toBeHidden();
    });

    test("con menos movimiento la captura aparece de inmediato", async ({ browser }) => {
        const contexto = await browser.newContext({ reducedMotion: "reduce" });
        const page = await contexto.newPage();
        await page.goto(PORTADA);
        await alCentro(page, "#pr-escena");
        await expect(escena(page)).toHaveClass(/pr-lista/, { timeout: 1500 });
        await contexto.close();
    });
});
