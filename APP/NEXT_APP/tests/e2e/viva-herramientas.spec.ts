import { expect, test } from "@playwright/test";
import { PORTADA } from "./viva-utils";
import { TOOL_COUNT } from "../../src/lib/tool-count";
import { getDefaultPublicToolCatalog } from "../../src/lib/tool-registry";

const catalogo = getDefaultPublicToolCatalog();

test.describe("Materia viva: herramientas", () => {
    test("están todas las herramientas reales, con su nombre", async ({ page }) => {
        await page.goto(PORTADA);
        const nodos = page.locator(".he-nodo");
        await expect(nodos).toHaveCount(TOOL_COUNT);
        const nombres = await nodos.evaluateAll((ns) => ns.map((n) => n.getAttribute("aria-label")));
        expect([...nombres].sort()).toEqual(catalogo.map((t) => t.name).sort());
    });

    test("al enfocar una, se nombra y se puede abrir", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        const t = catalogo[3];
        await page.locator(`.he-nodo[aria-label="${t.name}"]`).focus();
        await expect(page.locator("#he-nombre")).toHaveText(t.name);
        await expect(page.locator("#he-abrir")).toHaveAttribute("href", `/herramientas/${t.slug}`);
    });

    test("lo elegido se sostiene al ir a «Abrir» con el teclado", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        const t = catalogo[3];
        await page.locator(`.he-nodo[aria-label="${t.name}"]`).focus();
        await page.keyboard.press("Tab"); // un solo alto de tabulación: de la elegida se pasa directo a «Abrir»
        await expect(page.locator("#he-abrir")).toBeFocused();
        await page.waitForTimeout(3500); // antes, a los 3,2 s la órbita elegía otra por su cuenta
        await expect(page.locator("#he-abrir")).toHaveAttribute("href", `/herramientas/${t.slug}`);
        // Con las flechas se recorre la órbita.
        await page.locator(`.he-nodo[aria-label="${t.name}"]`).focus();
        await page.keyboard.press("ArrowRight");
        await expect(page.locator("#he-nombre")).toHaveText(catalogo[4].name);
    });

    test("filtrar por categoría deja solo las suyas", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        await page.locator("#herramientas").scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: /^Seguridad/ }).click();
        const esperadas = catalogo.filter((x) => x.category === "seguridad").length;
        await expect(page.locator(".he-nodo:not(.he-fuera)")).toHaveCount(esperadas);
    });

    test("ningún ícono lleva sombra: se agrandan y achican todo el tiempo", async ({ page }) => {
        await page.goto(PORTADA);
        const sombras = await page.locator(".he-nodo").evaluateAll((ns) => ns.map((n) => getComputedStyle(n).boxShadow));
        expect(sombras.length).toBe(TOOL_COUNT);
        expect(sombras.every((s) => s === "none")).toBe(true);
    });
});
