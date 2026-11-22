import { expect, test } from "@playwright/test";
import { PORTADA } from "./viva-utils";

test.describe("Materia viva: hero", () => {
    test("dice qué hace, en un solo título", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toHaveText(/Desarrollo\s*soluciones\./);
    });

    test("se elige qué forma la materia, y la elección se respeta", async ({ page }) => {
        await page.goto(PORTADA);
        const pestanas = page.locator(".elige [role=tab]");
        await expect(pestanas).toHaveText(["Tiendas y sitios", "Sistemas internos", "Herramientas"]);
        await pestanas.nth(2).click();
        await expect(pestanas.nth(2)).toHaveAttribute("aria-selected", "true");
        await page.waitForTimeout(5000); // sola rotaría cada 4,2 s
        await expect(pestanas.nth(2)).toHaveAttribute("aria-selected", "true");
    });

    test("muestra las tecnologías reales y la materia dibuja la que se señala", async ({ page }) => {
        await page.goto(PORTADA);
        const fichas = page.getByRole("group", { name: "Tecnologías con las que trabajo" }).getByRole("button");
        await expect(fichas).toHaveCount(10);
        await expect(page.locator(".marcas [role=button]")).toHaveCount(0); // botones nativos, no <li role="button">
        await expect(fichas.first()).toHaveAttribute("aria-label", "Next.js");
        // Hasta que la materia toma su forma, la página aún no atiende al cursor.
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        // Las fichas flotan sin parar: se lleva el cursor a su centro en vez de esperar a que se queden quietas.
        const caja = (await fichas.nth(1).boundingBox())!;
        await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
        await expect(fichas.nth(1)).toHaveClass(/activa/);
        // Nada que se agrande lleva sombra difusa: deja costuras en el navegador.
        const sombra = await fichas.nth(1).evaluate((e) => getComputedStyle(e).boxShadow);
        expect(sombra === "none" || (sombra.includes("inset") && !/\)\s*,/.test(sombra))).toBe(true);
    });
});
