import { expect, test } from "@playwright/test";

test.describe("Materia viva: temas", () => {
    test("oscuro por defecto, y la elección se recuerda", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
        await page.evaluate(() => localStorage.setItem("tema", "claro"));
        await page.reload({ waitUntil: "domcontentloaded" });
        // Se aplica antes de hidratar: el atributo ya viene puesto al terminar de cargar el documento.
        await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
    });

    test("un valor desconocido guardado no rompe el tema", async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.setItem("tema", "<script>"));
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
    });

    test("el botón principal cumple AA en los dos temas", async ({ page }) => {
        await page.goto("/");
        for (const tema of ["oscuro", "claro"]) {
            const contraste = await page.evaluate((t) => {
                document.documentElement.dataset.tema = t;
                const estilo = getComputedStyle(document.documentElement);
                const luz = (hex: string) => {
                    let n = hex.trim().replace("#", "");
                    if (n.length === 3) n = [...n].map((c) => c + c).join(""); // el compilador de CSS acorta #ffffff a #fff
                    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
                        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
                    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                };
                const a = luz(estilo.getPropertyValue("--boton")), b = luz(estilo.getPropertyValue("--boton-tinta"));
                return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            }, tema);
            expect(contraste, `contraste del botón en tema ${tema}`).toBeGreaterThanOrEqual(4.5);
        }
    });
});
