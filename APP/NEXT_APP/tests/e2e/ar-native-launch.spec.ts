import { expect, test } from "@playwright/test";

test.setTimeout(120_000);
const glb = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const usdz = "https://modelviewer.dev/shared-assets/models/Astronaut.usdz";
const path = `/ar?${new URLSearchParams({ glb, usdz, t: "Modelo de prueba" })}`;
const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36";
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

test("Android recibe un lanzamiento AR antes de la previsualización, incluso sin JS", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: android, javaScriptEnabled: false, viewport: { width: 375, height: 850 } });
    try {
        const page = await context.newPage();
        await page.goto(path);
        const launch = page.getByRole("link", { name: "Ver en mi espacio", exact: true });
        await expect(launch).toBeVisible();
        const href = await launch.getAttribute("href");
        expect(href).toContain("intent://arvr.google.com/scene-viewer/1.0?");
        expect(href).toContain("mode=ar_preferred");
        expect(href).toContain("package=com.google.android.googlequicksearchbox");
        expect(new URL(href!.split("#Intent")[0]).searchParams.get("file")).toBe(glb);
        expect(href).toContain("S.browser_fallback_url=");
        expect((await launch.boundingBox())!.y).toBeLessThan((await page.getByRole("heading", { name: "Vista 3D sin cámara" }).boundingBox())!.y);
        await expect(page.locator("model-viewer")).toHaveCount(0);
        await expect(page.getByText(/no necesitas mantener el QR frente a la cámara/)).toBeVisible();
    } finally { await context.close(); }
});

test("iPhone recibe el enlace USDZ con un único hijo img requerido por Quick Look", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: iphone, javaScriptEnabled: false });
    try {
        const page = await context.newPage();
        await page.goto(path);
        const launch = page.getByRole("link", { name: "Ver en mi espacio", exact: true });
        await expect(launch).toHaveAttribute("rel", "ar");
        await expect(launch).toHaveAttribute("href", usdz);
        expect(await launch.evaluate(element => [...element.childNodes].map(node => node.nodeName))).toEqual(["IMG"]);
        await expect(launch.locator("img")).toHaveAttribute("src", "/images/ar/place-model.svg");
        expect(await launch.evaluate(element => getComputedStyle(element, "::after").content)).toContain("Ver en mi espacio");
    } finally { await context.close(); }
});

test("iPad con agente de escritorio obtiene Quick Look al detectar la pantalla táctil", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15" });
    try {
        await context.addInitScript(() => Object.defineProperty(navigator, "maxTouchPoints", { value: 5 }));
        const page = await context.newPage();
        await page.goto(path);
        await expect(page.locator('[data-ar-platform="ios"]')).toBeVisible();
        await expect(page.getByRole("link", { name: "Ver en mi espacio", exact: true })).toHaveAttribute("href", usdz);
    } finally { await context.close(); }
});

test("un formato ausente informa del problema y permite corregir el dispositivo", async ({ browser }) => {
    const context = await browser.newContext({ userAgent: iphone });
    try {
        const page = await context.newPage();
        await page.goto(`/ar?${new URLSearchParams({ glb })}`);
        await expect(page.getByRole("status").filter({ hasText: "archivo USDZ" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Ver en mi espacio", exact: true })).toHaveCount(0);
        await page.getByText("¿No aparece la cámara o detectamos otro dispositivo?", { exact: true }).click();
        await page.getByRole("button", { name: "Android", exact: true }).click();
        await expect(page.getByRole("link", { name: "Ver en mi espacio", exact: true })).toHaveAttribute("href", /intent:/);
        await page.getByRole("button", { name: "Computador", exact: true }).click();
        await expect(page.getByRole("img", { name: "Código QR para abrir este modelo en el móvil" })).toBeVisible();
    } finally { await context.close(); }
});

test("la página de llegada conserva el QR, instrucciones y ancho en móviles y escritorio", async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("img", { name: "Código QR para abrir este modelo en el móvil" })).toBeVisible();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await page.evaluate(() => { for (const element of [document.documentElement, document.body]) element.style.setProperty("overflow-x", "visible", "important"); });
    for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))).toBeLessThanOrEqual(width);
    }
});
