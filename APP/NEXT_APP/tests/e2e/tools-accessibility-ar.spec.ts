import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY } from "../../src/lib/tool-registry";

test.setTimeout(120_000);

test("la búsqueda de herramientas es un diálogo modal que devuelve el foco al cerrarse", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 850 });
    await page.goto("/herramientas/qr");
    const abrir = page.getByRole("button", { name: "Abrir navegación de herramientas" });
    await abrir.click();
    const dialogo = page.getByRole("dialog", { name: "Navegación de herramientas" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole("searchbox", { name: "Buscar en la navegación" })).toBeFocused();
    // Modal de verdad (showModal): lo de atrás queda inerte sin trucos a mano.
    expect(await page.evaluate(() => document.querySelector("dialog.hc-dialogo")!.matches(":modal"))).toBe(true);
    await expect(dialogo.getByRole("link", { name: "Generador de QR" })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();
    expect(await page.locator("dialog.hc-dialogo").evaluate((d: HTMLDialogElement) => d.open)).toBe(false);
});

test("la vista AR incrustada se puede desmontar y volver a abrir", async ({ page }) => {
    await page.goto("/herramientas/qr?tipo=ar");
    await page.getByRole("button", { name: "Usar modelo de ejemplo" }).click();
    const preview = page.locator("#ar-model-preview");
    await expect(preview).toHaveCount(0);
    await page.getByRole("button", { name: "Previsualizar modelo 3D" }).click();
    await expect(preview).toHaveCount(1);
    await page.getByRole("button", { name: "Cerrar vista previa" }).click();
    await expect(preview).toHaveCount(0);
    await page.getByRole("button", { name: "Previsualizar modelo 3D" }).click();
    await expect(preview).toHaveCount(1);
});

test("el visor 3D carga por solicitud y se puede cerrar durante la carga", async ({ page }) => {
    await page.goto("/ar?glb=https%3A%2F%2Fexample.com%2Fobjeto.glb");
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await page.getByRole("button", { name: "Cargar vista 3D" }).click();
    await page.getByRole("button", { name: "Cerrar vista 3D" }).click();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cargar vista 3D" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cargar vista 3D" })).toBeFocused();
    await expect(page.getByText("Cargando modelo…")).toHaveCount(0);
});

test("la guía AR entrega respuestas visibles y coherentes con su schema sin JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
        const page = await context.newPage();
        await page.goto("/ar");
        const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent ?? "{}")));
        const faq = schemas.find(schema => schema["@type"] === "FAQPage");
        expect(faq.mainEntity).toHaveLength(7);
        for (const question of faq.mainEntity) {
            await expect(page.getByText(question.name, { exact: true })).toBeVisible();
            await expect(page.getByText(question.acceptedAnswer.text, { exact: true })).toBeVisible();
        }
        await expect(page.locator("h1")).toHaveCount(1);
        const example = page.locator('a[href^="/ar?"]').first();
        await expect(example).toHaveAttribute("href", /glb=.*usdz=/);
        await page.setViewportSize({ width: 320, height: 850 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: "/tmp/portfolio-ar-guide-mobile.png", fullPage: true });
    } finally { await context.close(); }
});

for (const tool of DEFAULT_TOOL_REGISTRY.filter(tool => tool.isPublic && tool.isActive)) {
    test(`${tool.slug}: espacio de trabajo adaptable de móvil a escritorio`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/herramientas/${tool.slug}`);
        await expect(page.locator("h1")).toHaveCount(1);
        // Detect actual overflow, even when global CSS would conceal it.
        await page.evaluate(() => {
            for (const element of [document.documentElement, document.body]) element.style.setProperty("overflow-x", "visible", "important");
        });
        for (const width of [320, 375, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            // Let the browser apply the new media queries and layout before measuring.
            await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
            expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)), `desbordamiento en ${tool.slug} a ${width}px`).toBeLessThanOrEqual(width);
        }
    });
}
