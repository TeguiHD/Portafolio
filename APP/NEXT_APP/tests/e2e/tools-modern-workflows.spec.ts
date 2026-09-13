import { expect, test, type Page, type Download } from "@playwright/test";
import JSZip from "jszip";

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

async function bytes(download: Download) {
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

test("JSON maneja archivos, primitivas, errores y descarga sin perder Unicode", async ({ page }) => {
    await page.goto("/herramientas/json");
    const input = page.getByRole("textbox", { name: "Entrada JSON" });
    const download = page.getByRole("button", { name: "JSON", exact: true });
    await input.fill("false");
    await expect(page.getByLabel("Resultado JSON")).toHaveText("false");
    await input.fill('{"nombre":"Ñandú 🌿", "orden": [3,2,1]}');
    await expect(download).toBeEnabled();
    const event = page.waitForEvent("download");
    await download.click();
    expect(JSON.parse((await bytes(await event)).toString())).toEqual({ nombre: "Ñandú 🌿", orden: [3, 2, 1] });
    await input.fill("{invalid");
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(download).toBeDisabled();
    await page.getByLabel("Archivo JSON", { exact: true }).setInputFiles({ name: "sample.json", mimeType: "application/json", buffer: Buffer.from('{"ok":true}') });
    await expect(page.getByLabel("Resultado JSON")).toContainText('"ok": true');
    await page.screenshot({ path: "/tmp/portfolio-json-modern.png" });
});

test("recientes conservan el orden de visita, se abren por teclado y se borran", async ({ page }) => {
    await page.goto("/herramientas/json");
    await page.keyboard.press("Control+k");
    await page.getByLabel("Buscar en la navegación").fill("base64");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/herramientas\/base64$/);
    await page.goto("/herramientas");
    const recents = page.getByLabel("Herramientas recientes");
    await expect(recents.getByRole("link")).toHaveCount(2);
    await expect(recents.getByRole("link").first()).toHaveAttribute("href", "/herramientas/base64");
    await page.getByRole("button", { name: "Borrar herramientas recientes" }).click();
    await page.reload();
    await expect(recents).toHaveCount(0);
});

for (const slug of ["convertir-imagen", "comprimir-imagen", "redimensionar"]) {
    test(`${slug}: resultado automático y PNG con tamaño exacto`, async ({ page }) => {
        await page.goto(`/herramientas/${slug}`);
        await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
        await page.getByRole("button", { name: "PNG", exact: true }).click();
        if (slug === "redimensionar") await page.getByLabel("Ancho (px)").fill("160");
        const button = page.getByRole("button", { name: "Descargar", exact: true });
        await expect(button).toBeEnabled();
        const event = page.waitForEvent("download");
        await button.click();
        const file = await bytes(await event);
        expect(file.readUInt32BE(16)).toBe(slug === "redimensionar" ? 160 : 320);
        expect(file.readUInt32BE(20)).toBe(slug === "redimensionar" ? 120 : 240);
        await page.setViewportSize({ width: 375, height: 850 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
        await page.screenshot({ path: `/tmp/portfolio-${slug}-mobile.png`, fullPage: true });
    });
}

test("recortar genera al mover el encuadre y mantiene el editor visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/herramientas/recortar-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    await page.getByRole("button", { name: /^1:1:/ }).click();
    const download = page.getByRole("button", { name: /Descargar/ });
    await expect(download).toBeEnabled();
    await expect(page.locator(".reactEasyCrop_Container")).toBeInViewport();
    const event = page.waitForEvent("download");
    await download.click();
    const file = await bytes(await event);
    expect(file.readUInt32BE(16)).toBe(file.readUInt32BE(20));
    expect(file.readUInt32BE(16)).toBeGreaterThan(0);
    await page.setViewportSize({ width: 375, height: 850 });
    await expect(download).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await page.screenshot({ path: "/tmp/portfolio-crop-mobile.png", fullPage: true });
});

test("favicon empaqueta PNG reales de ocho tamaños y manifest coherente", async ({ page }) => {
    await page.goto("/herramientas/favicon");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const download = page.getByRole("button", { name: "Descargar ZIP" });
    await expect(download).toBeEnabled();
    const event = page.waitForEvent("download");
    await download.click();
    const zip = await JSZip.loadAsync(await bytes(await event));
    const pngs = Object.keys(zip.files).filter(file => file.endsWith(".png"));
    expect(pngs).toHaveLength(8);
    for (const name of pngs) {
        const png = await zip.file(name)!.async("nodebuffer");
        expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20));
    }
    const manifest = JSON.parse(await zip.file("site.webmanifest")!.async("string"));
    for (const icon of manifest.icons) expect(zip.file(icon.src.slice(1))).not.toBeNull();
});

test("quitafondos: error recuperable, pincel real, historial, restauración y resize", async ({ page, context }) => {
    await context.route("https://staticimgly.com/**", route => route.abort("failed"));
    await page.goto("/herramientas/quitar-fondo");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    await page.getByRole("button", { name: "Abrir editor manual" }).click({ timeout: 60_000 });
    const canvas = page.getByLabel("Resultado editable", { exact: true });
    const alpha = () => canvas.evaluate((node: HTMLCanvasElement) => node.getContext("2d")!.getImageData(node.width / 2, node.height / 2, 1, 1).data[3]);
    expect(await alpha()).toBe(255);
    await page.getByLabel("Dureza", { exact: true }).fill("100");
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(alpha).toBe(0);
    await page.getByRole("button", { name: "Deshacer pincelada" }).click();
    await expect.poll(alpha).toBe(255);
    await page.getByRole("button", { name: "Rehacer pincelada" }).click();
    await expect.poll(alpha).toBe(0);
    await page.getByRole("button", { name: "Restaurar", exact: true }).click();
    await expect.poll(alpha).toBe(56); // Ghost preview: 22% of 255.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(alpha).toBe(255);
    await page.getByRole("button", { name: "Borrar", exact: true }).click();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(alpha).toBe(0);
    await page.setViewportSize({ width: 375, height: 850 });
    await expect.poll(alpha).toBe(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(alpha).toBe(0);
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar PNG", exact: true }).click();
    const file = await bytes(await event);
    expect(file.readUInt32BE(16)).toBe(320);
    expect(file.readUInt32BE(20)).toBe(240);
    const encoded = file.toString("base64");
    expect(await page.evaluate(async base64 => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
        const c = document.createElement("canvas"); c.width = image.width; c.height = image.height;
        const ctx = c.getContext("2d")!; ctx.drawImage(image, 0, 0);
        return ctx.getImageData(160, 120, 1, 1).data[3];
    }, encoded)).toBe(0);
});

test("dropzone admite pegado y rechaza RIFF falsamente etiquetado WebP", async ({ page }) => {
    await page.goto("/herramientas/convertir-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "audio.webp", mimeType: "image/webp", buffer: Buffer.from("RIFF0000WAVEfmt ") });
    await expect(page.locator("main").getByRole("alert")).toContainText("No pudimos reconocer");
    const image = await fixture(page);
    await page.getByRole("group", { name: "Área para soltar o pegar una imagen" }).evaluate((element, base64) => {
        const data = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
        const clipboardData = new DataTransfer();
        clipboardData.items.add(new File([data], "pegada.png", { type: "image/png" }));
        element.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true }));
    }, image.buffer.toString("base64"));
    await expect(page.getByRole("button", { name: "Descargar", exact: true })).toBeEnabled();
});

test("ICO se genera automáticamente, contiene cuatro tamaños y conserva la proporción", async ({ page }) => {
    await page.goto("/herramientas/convertir-ico");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    await page.getByRole("button", { name: "256×256", exact: true }).click();
    const download = page.getByRole("button", { name: "Descargar ICO", exact: true });
    await expect(download).toBeEnabled();
    const event = page.waitForEvent("download");
    await download.click();
    const ico = await bytes(await event);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(4);
    expect(ico[6 + 3 * 16]).toBe(0); // ICO uses zero to encode 256 pixels.
    const offset = ico.readUInt32LE(18);
    const length = ico.readUInt32LE(14);
    const png = ico.subarray(offset, offset + length);
    expect(png.readUInt32BE(16)).toBe(16);
    const alpha = await page.evaluate(async base64 => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 16;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
        return [ctx.getImageData(0, 0, 1, 1).data[3], ctx.getImageData(8, 8, 1, 1).data[3]];
    }, png.toString("base64"));
    expect(alpha).toEqual([0, 255]);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("marca de agua exporta píxeles editados y bloquea una marca vacía", async ({ page }) => {
    await page.goto("/herramientas/marca-agua");
    const source = await fixture(page);
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(source);
    await page.getByLabel("Texto de la marca", { exact: true }).fill("");
    const download = page.getByRole("button", { name: "Descargar PNG con marca de agua", exact: true });
    await expect(download).toBeDisabled();
    await page.getByLabel("Texto de la marca", { exact: true }).fill("Mi marca ✓");
    await page.getByLabel("Opacidad", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Centro", exact: true }).click();
    await expect(download).toBeEnabled();
    const event = page.waitForEvent("download");
    await download.click();
    const png = await bytes(await event);
    expect(png.readUInt32BE(16)).toBe(320);
    expect(png.readUInt32BE(20)).toBe(240);
    const changed = await page.evaluate(async encoded => {
        const pixels = async (base64: string) => {
            const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
            const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 240;
            const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, 320, 240).data;
        };
        const before = await pixels(encoded.before), after = await pixels(encoded.after);
        return after.reduce((count, channel, index) => count + Number(channel !== before[index]), 0);
    }, { before: source.buffer.toString("base64"), after: png.toString("base64") });
    expect(changed).toBeGreaterThan(100);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await page.screenshot({ path: "/tmp/portfolio-watermark-mobile.png", fullPage: true });
});

test("paleta extrae colores al subir y descarga variables CSS", async ({ page }) => {
    await page.goto("/herramientas/paleta-colores");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await fixture(page));
    const download = page.getByRole("button", { name: "CSS", exact: true });
    await expect(download).toBeEnabled();
    const event = page.waitForEvent("download");
    await download.click();
    const css = (await bytes(await event)).toString();
    expect(css).toContain(":root {");
    expect(css).toContain("--palette-1:");
    const colors = css.match(/#[a-f0-9]{6}/gi);
    expect(colors?.length).toBeGreaterThanOrEqual(2);
    expect(new Set(colors).size).toBe(colors?.length);
    await page.setViewportSize({ width: 375, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
