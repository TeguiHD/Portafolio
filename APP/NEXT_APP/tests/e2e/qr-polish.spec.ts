import { test, expect } from "@playwright/test";

for (const width of [320, 375, 768, 1024, 1440]) {
    test(`QR visible al personalizar y guía alineada a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 850 });
        await page.goto("/herramientas/qr");
        await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeEnabled();
        await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toHaveCount(1);
        await expect(page.getByRole("link", { name: /Catálogo \// })).toHaveCount(0);
        await expect(page.getByText("QR generado en tu navegador")).toHaveCount(0);
        await expect(page.getByText("Quién mantiene esta herramienta")).toHaveCount(0);
        await page.getByRole("button", { name: "Personalizar", exact: true }).click();
        const canvas = page.getByRole("img", { name: "Vista previa del código QR", exact: true });
        for (const label of ["Cuerpo hexadecimal", "Ojos hexadecimal"]) {
            await page.getByLabel(label, { exact: true }).fill("#14532d");
            await expect(canvas).toBeInViewport({ ratio: 1 });
        }
        await page.getByRole("group", { name: "Forma del cuerpo", exact: true }).getByRole("button", { name: "Puntos", exact: true }).click();
        await expect(canvas).toBeInViewport({ ratio: 1 });
        await expect(page.getByRole("button", { name: "Descargar SVG", exact: true })).toBeInViewport({ ratio: 1 });
        await page.getByText("Opciones de exportación", { exact: true }).click();
        await page.getByLabel("Nombre del archivo").fill("qr-personalizado");
        await expect(canvas).toBeInViewport({ ratio: 1 });
        const guide = page.locator(".tool-guide > summary");
        await guide.scrollIntoViewIfNeeded();
        const bounds = await guide.boundingBox();
        expect(bounds!.height).toBeLessThan(85);
        await guide.click();
        await expect(page.getByRole("heading", { name: "Preguntas frecuentes", exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    });
}

test("selector compacto conserva todos los tipos y selección al contraer", async ({ page }) => {
    await page.goto("/herramientas/qr");
    const types = page.getByRole("group", { name: "Tipo de código QR", exact: true });
    await expect(types.getByRole("button")).toHaveCount(5);
    await types.getByRole("button", { name: "Más tipos" }).click();
    await expect(types.getByRole("button")).toHaveCount(14);
    await types.getByRole("button", { name: "Texto", exact: true }).click();
    await page.getByLabel("Escribe cualquier texto...").fill("Una idea clara");
    await types.getByRole("button", { name: "Menos tipos" }).click();
    await expect(types.getByRole("button", { name: "Texto", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeEnabled();
});
