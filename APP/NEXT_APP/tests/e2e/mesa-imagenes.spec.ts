import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

async function fixture(page: Page) {
    const encoded = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#1c7866"; context.fillRect(0, 0, 320, 240);
        context.fillStyle = "#edbd89"; context.fillRect(80, 60, 160, 120);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    return { name: "prueba.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") };
}

/** Pulsar y mantener: hover() espera a que el botón esté estable y a la vista antes de bajar el ratón. */
async function mantener(page: Page, nombre: string) {
    const boton = page.getByRole("button", { name: nombre, exact: true });
    await boton.hover();
    await page.mouse.down();
    return async () => { await page.mouse.up(); };
}

test("quitar fondo: carril, pasos, comparar manteniendo, máscara y contador de cambios", async ({ page, context }) => {
    await context.route("https://staticimgly.com/**", route => route.abort("failed"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/quitar-fondo");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const nodos = page.getByRole("list", { name: "Progreso del recorte" }).locator(".mesa-nodo");
    await expect(nodos.nth(1)).toHaveAttribute("data-estado", "error", { timeout: 60_000 });
    await page.getByRole("button", { name: "Abrir editor manual" }).click();
    await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo");

    const rail = page.getByRole("toolbar", { name: "Herramientas de retoque" });
    const railBox = (await rail.boundingBox())!;
    const escenario = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railBox.width).toBeLessThanOrEqual(72);
    expect(railBox.x).toBeGreaterThanOrEqual(escenario.x + escenario.width - 1);

    const canvas = page.getByLabel("Resultado editable", { exact: true });
    const alpha = () => canvas.evaluate((node: HTMLCanvasElement) => node.getContext("2d")!.getImageData(node.width / 2, node.height / 2, 1, 1).data[3]);
    await page.getByLabel("Dureza", { exact: true }).fill("100");
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(alpha).toBe(0);
    await expect(page.locator(".mesa-cambios")).toHaveText("1 cambio");

    const soltar = await mantener(page, "Comparar con el original");
    await expect.poll(alpha).toBe(255);
    await expect(page.getByRole("button", { name: "Comparar con el original", exact: true })).toHaveAttribute("aria-pressed", "true");
    await soltar();
    await expect.poll(alpha).toBe(0);

    await page.getByRole("button", { name: "Ver máscara", exact: true }).click();
    await expect(page.getByLabel("Máscara editable del recorte", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ver máscara", exact: true }).click();
    await expect(canvas).toBeVisible();

    await canvas.focus();
    await page.keyboard.down("c");
    await expect.poll(alpha).toBe(255);
    await page.keyboard.up("c");
    await expect.poll(alpha).toBe(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const railMovil = (await rail.boundingBox())!;
    const escenarioMovil = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railMovil.y).toBeGreaterThanOrEqual(escenarioMovil.y + escenarioMovil.height - 1);
    expect(railMovil.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("quitar fondo: con movimiento reducido no queda ninguna animación activa", async ({ page, context }) => {
    await context.route("https://staticimgly.com/**", route => route.abort("failed"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/herramientas/quitar-fondo");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    await page.getByRole("button", { name: "Abrir editor manual" }).click({ timeout: 60_000 });
    const animadas = await page.evaluate(() => Array.from(document.querySelectorAll(".mesa, .mesa *")).filter(element => getComputedStyle(element).animationName !== "none").length);
    expect(animadas).toBe(0);
});

test("recortar: modos en el carril, proporciones en el pie, pasos hasta listo y sin panel lateral", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/recortar-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const rail = page.getByRole("toolbar", { name: "Herramientas de recorte" });
    await expect(rail.getByRole("button", { name: "Recortar", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^16:9:/ }).click();
    await expect(page.getByRole("button", { name: /^16:9:/ })).toHaveAttribute("aria-pressed", "true");
    const nodos = page.getByRole("list", { name: "Progreso del recorte" }).locator(".mesa-nodo");
    await expect(nodos.nth(2)).toHaveAttribute("data-estado", "listo");
    await expect(page.getByRole("button", { name: /Descargar/ })).toBeEnabled();
    await expect(page.getByLabel("Zoom", { exact: true })).toBeVisible();
    await rail.getByRole("button", { name: "Marcar sujeto", exact: true }).click();
    await expect(page.getByLabel("Margen", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Zoom", { exact: true })).toHaveCount(0);
    expect(await page.locator('section[aria-label="Editor de recorte"] aside').count()).toBe(0);
    const railBox = (await rail.boundingBox())!;
    const escenario = (await page.locator(".mesa-escenario").boundingBox())!;
    expect(railBox.x).toBeGreaterThanOrEqual(escenario.x + escenario.width - 1);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
