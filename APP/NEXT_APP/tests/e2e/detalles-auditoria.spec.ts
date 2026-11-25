import { expect, test, type Page } from "@playwright/test";

/**
 * Detalles de la auditoría del 25-11-2026: Lighthouse marcó el contraste de las migas (4,19:1) y un enlace del Índice que
 * solo se distinguía por el color; el botón de buscar decía «⌘K» también fuera de Mac.
 */

/** Contraste WCAG entre el color de un elemento y el fondo de la página. */
async function contraste(page: Page, selector: string): Promise<number> {
    return page.locator(selector).first().evaluate((el) => {
        // Chrome entrega los colores de Tailwind 4 en lab()/oklch(): el lienzo los pasa a sRGB.
        const lienzo = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const rgb = (c: string) => { lienzo.clearRect(0, 0, 1, 1); lienzo.fillStyle = c; lienzo.fillRect(0, 0, 1, 1); return [...lienzo.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
        const luz = ([r, g, b]: number[]) => {
            const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const fondo = getComputedStyle(document.documentElement).getPropertyValue("--fondo").trim();
        const a = luz(rgb(getComputedStyle(el).color)), b = luz(rgb(fondo));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
}

test.describe("detalles de la auditoría", () => {
    // Las herramientas tienen su propio ajuste de tema claro (tema-claro.css); el Índice no.
    for (const [ruta, tema] of [["/herramientas", "oscuro"], ["/indice-web-chilena", "oscuro"], ["/indice-web-chilena", "claro"]] as const) {
        test(`las migas se leen en ${ruta} con el tema ${tema}`, async ({ page }) => {
            // El tema entra guardado, como para quien ya lo eligió: cambiarlo en vivo dispara la transición de color del enlace.
            await page.addInitScript((t) => { try { localStorage.setItem("tema", t); } catch { /* sin almacenamiento */ } }, tema);
            await page.goto(ruta);
            await expect(page.locator("html")).toHaveAttribute("data-tema", tema);
            const migas = 'nav[aria-label="Ruta de navegación"]';
            expect(await contraste(page, `${migas} a`)).toBeGreaterThanOrEqual(4.5);
            expect(await contraste(page, `${migas} [aria-current="page"]`)).toBeGreaterThanOrEqual(4.5);
        });
    }

    test("el enlace dentro de un párrafo del Índice va subrayado", async ({ page }) => {
        await page.goto("/indice-web-chilena");
        const enlace = page.locator(".ix-nota a").first();
        await expect(enlace).toBeVisible();
        expect(await enlace.evaluate((a) => getComputedStyle(a).textDecorationLine)).toContain("underline");
    });

    test("el botón de buscar muestra Ctrl K fuera de Mac", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/herramientas/json");
        await expect(page.locator(".hc-boton kbd")).toHaveText("Ctrl K");
    });

    test("en Mac muestra ⌘K", async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(Navigator.prototype, "platform", { get: () => "MacIntel" });
            Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => ({ platform: "macOS" }) });
        });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/herramientas/json");
        await expect(page.locator(".hc-boton kbd")).toHaveText("⌘K");
    });
});
