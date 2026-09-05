import { test, expect, type Page } from "@playwright/test";
import jsQR from "jsqr";

test.setTimeout(120_000);

async function waitForQR(page: Page) {
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeEnabled();
}

async function decodeCanvas(page: Page) {
    const pixels = await page.locator('canvas[aria-label="Vista previa del código QR"]').evaluate((canvas: HTMLCanvasElement) => {
        const small = document.createElement("canvas");
        small.width = small.height = 512;
        const context = small.getContext("2d")!;
        context.drawImage(canvas, 0, 0, 512, 512);
        return Array.from(context.getImageData(0, 0, 512, 512).data);
    });
    return jsQR(new Uint8ClampedArray(pixels), 512, 512)?.data;
}

test("QR actualizable y PNG de resolución exacta incluso en pantalla Retina", async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto("/herramientas/qr");
    await page.getByLabel("https://ejemplo.com", { exact: true }).fill("https://example.com/catalogo");
    await waitForQR(page);
    expect(await decodeCanvas(page)).toBe("https://example.com/catalogo");
    await page.getByLabel("Resolución PNG", { exact: true }).selectOption("512");
    await waitForQR(page);
    await page.getByLabel("Nombre del archivo").fill("catalogo-2026");
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar PNG", exact: true }).click();
    const file = await downloaded;
    expect(file.suggestedFilename()).toBe("catalogo-2026.png");
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
    await context.close();
});

test("contenido demasiado largo bloquea exportación y se recupera al corregirlo", async ({ page }) => {
    await page.goto("/herramientas/qr?tipo=text");
    const input = page.getByLabel("Escribe cualquier texto...");
    await input.fill("x".repeat(5000));
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo generar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeDisabled();
    await input.fill("QR con ñ y emojis 🌍");
    await waitForQR(page);
    expect(await decodeCanvas(page)).toBe("QR con ñ y emojis 🌍");
});

test("AR accesible por enlace directo, valida modelos y exporta un destino utilizable", async ({ page }) => {
    await page.goto("/herramientas/qr?tipo=ar");
    await expect(page.getByRole("button", { name: "Realidad aumentada", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Modelo 3D · GLB / glTF", { exact: true }).fill("http://example.com/objeto.glb");
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Usar modelo de ejemplo", exact: true }).click();
    await page.getByLabel("Corrección de errores").selectOption("M");
    await waitForQR(page);
    const decoded = await decodeCanvas(page);
    expect(decoded).toBeTruthy();
    const url = new URL(decoded!);
    expect(url.pathname).toBe("/ar");
    expect(url.searchParams.get("glb")).toMatch(/Astronaut\.glb$/);
    expect(url.searchParams.get("usdz")).toMatch(/Astronaut\.usdz$/);
    await expect(page.getByRole("link", { name: /Probar experiencia/ })).toHaveAttribute("href", `/ar?${url.searchParams}`);
});

test("los permisos del visor se limitan a su ruta y al origen HTTPS validado", async ({ request }) => {
    const model = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    const preview = await request.get(`/ar/preview?glb=${encodeURIComponent(model)}`);
    expect(preview.status()).toBe(200);
    expect(preview.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(preview.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(preview.headers()["content-security-policy"]).toMatch(/connect-src[^;]*https:\/\/modelviewer.dev/);
    const qr = await request.get(`/herramientas/qr?glb=${encodeURIComponent(model)}`);
    expect(qr.headers()["x-frame-options"]).toBe("DENY");
    expect(qr.headers()["content-security-policy"]).not.toMatch(/connect-src[^;]*modelviewer.dev/);
    const invalid = await request.get("/ar/preview?glb=javascript:alert(1)");
    expect(invalid.headers()["content-security-policy"]).not.toContain("javascript:");
});

test("Base64 permite codificar, invertir, decodificar y recuperar errores", async ({ page }) => {
    await page.goto("/herramientas/base64");
    const value = "Diseño, ñ y emojis 🌍";
    await page.getByRole("textbox", { name: "Entrada", exact: true }).fill(value);
    await expect(page.getByRole("textbox", { name: "Resultado", exact: true })).toHaveValue(Buffer.from(value).toString("base64"));
    await page.getByRole("button", { name: "Invertir", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Resultado", exact: true })).toHaveValue(value);
    await page.getByRole("textbox", { name: "Entrada", exact: true }).fill("%%%invalid");
    // Next añade su propio anunciador de rutas con role="alert"; acotamos al contenido.
    await expect(page.locator("main").getByRole("alert")).toContainText("no es Base64");
    await expect(page.getByRole("button", { name: "Copiar resultado", exact: true })).toBeDisabled();
});

test("navegación móvil por teclado y favoritas compartidas con el catálogo", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 850 });
    await page.goto("/herramientas/qr");
    await page.getByRole("button", { name: "Guardar herramienta", exact: true }).click();
    await expect(page.getByRole("button", { name: "Guardada", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Control+k");
    const search = page.getByRole("textbox", { name: "Buscar en la navegación" });
    await expect(search).toBeFocused();
    await search.fill("json");
    await expect(page.locator("#tools-sidebar").getByRole("link", { name: "Formateador JSON", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(search).not.toBeVisible();
    await page.getByRole("link", { name: "Ver QR y descargar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tu código QR", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
