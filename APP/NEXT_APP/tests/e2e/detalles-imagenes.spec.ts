import { expect, test, type Download, type Page } from "@playwright/test";
import JSZip from "jszip";

test.setTimeout(90_000);

/** PNG dibujado en el navegador. `transparente` deja la mitad izquierda sin pintar (alfa 0). */
async function png(page: Page, ancho: number, alto: number, transparente = false) {
    const base64 = await page.evaluate(({ ancho, alto, transparente }) => {
        const canvas = document.createElement("canvas");
        canvas.width = ancho; canvas.height = alto;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#1c7866"; context.fillRect(transparente ? Math.floor(ancho / 2) : 0, 0, ancho, alto);
        context.fillStyle = "#edbd89"; context.fillRect(Math.floor(ancho * 0.6), Math.floor(alto / 4), Math.max(1, Math.floor(ancho / 4)), Math.max(1, Math.floor(alto / 2)));
        return canvas.toDataURL("image/png").split(",")[1];
    }, { ancho, alto, transparente });
    return Buffer.from(base64, "base64");
}

async function bytes(download: Download) {
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

function segmento(marcador: number, contenido: Buffer) {
    const cabecera = Buffer.alloc(4);
    cabecera.writeUInt16BE(marcador, 0);
    cabecera.writeUInt16BE(contenido.length + 2, 2);
    return Buffer.concat([cabecera, contenido]);
}

/** TIFF big-endian: Make = «Pixel», Orientation = 6 y ExposureTime = 1/250 en el sub-IFD EXIF. */
function tiff() {
    const b = Buffer.alloc(200);
    b.write("MM", 0, "latin1"); b.writeUInt16BE(42, 2); b.writeUInt32BE(8, 4);
    b.writeUInt16BE(3, 8);
    b.writeUInt16BE(0x010f, 10); b.writeUInt16BE(2, 12); b.writeUInt32BE(6, 14); b.writeUInt32BE(100, 18);
    b.writeUInt16BE(0x0112, 22); b.writeUInt16BE(3, 24); b.writeUInt32BE(1, 26); b.writeUInt16BE(6, 30);
    b.writeUInt16BE(0x8769, 34); b.writeUInt16BE(4, 36); b.writeUInt32BE(1, 38); b.writeUInt32BE(120, 42);
    b.writeUInt32BE(0, 46);
    b.write("Pixel\0", 100, "latin1");
    b.writeUInt16BE(1, 120); b.writeUInt16BE(0x829a, 122); b.writeUInt16BE(5, 124); b.writeUInt32BE(1, 126); b.writeUInt32BE(150, 130); b.writeUInt32BE(0, 134);
    b.writeUInt32BE(1, 150); b.writeUInt32BE(250, 154);
    return b;
}

/** JPEG real del lienzo con un XMP y luego el EXIF, tras el JFIF (como lo dejan varios editores). */
async function jpegConExif(page: Page) {
    const base64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 120; canvas.height = 80;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#1c7866"; context.fillRect(0, 0, 120, 80);
        return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    });
    const jpeg = Buffer.from(base64, "base64");
    const finApp0 = jpeg.readUInt16BE(2) === 0xffe0 ? 4 + jpeg.readUInt16BE(4) : 2;
    const xmp = segmento(0xffe1, Buffer.from("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>", "latin1"));
    const exif = segmento(0xffe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff()]));
    return Buffer.concat([jpeg.subarray(0, finApp0), xmp, exif, jpeg.subarray(finApp0)]);
}

test("esteganografía: un PNG con transparencia guarda el mensaje y se vuelve a leer", async ({ page }) => {
    await page.goto("/herramientas/esteganografia-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await png(page, 200, 120, true) });
    const mensaje = "Hola ñandú 🚀 nos vemos a las 8";
    await page.locator("textarea").fill(mensaje);
    await page.getByRole("button", { name: /Ocultar en Imagen/ }).click();
    const descargar = page.getByRole("button", { name: /Descargar PNG/ });
    await expect(descargar).toBeVisible();
    const evento = page.waitForEvent("download");
    await descargar.click();
    const descarga = await evento;
    expect(descarga.suggestedFilename()).toBe("logo_stego.png");
    const archivo = await bytes(descarga);

    // Cambiar el texto descarta el PNG anterior: no se puede bajar algo distinto de lo que se ve.
    await page.locator("textarea").fill(`${mensaje}!`);
    await expect(descargar).toBeHidden();

    await page.getByRole("button", { name: /Extraer Mensaje/ }).first().click();
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "logo_stego.png", mimeType: "image/png", buffer: archivo });
    await page.getByRole("button", { name: /Extraer Mensaje/ }).last().click();
    await expect(page.locator("main")).toContainText(mensaje);
});

test("esteganografía: un mensaje que no cabe se avisa en vez de cortarse", async ({ page }) => {
    await page.goto("/herramientas/esteganografia-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: await png(page, 8, 8) });
    await page.locator("textarea").fill("Este texto es bastante más largo de lo que caben en sesenta y cuatro píxeles.");
    await expect(page.getByRole("alert").filter({ hasText: "El mensaje no cabe" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ocultar en Imagen/ })).toBeDisabled();
});

test("esteganografía: pegar una imagen con el foco en el mensaje cambia la imagen de portada", async ({ page }) => {
    await page.goto("/herramientas/esteganografia-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "primera.png", mimeType: "image/png", buffer: await png(page, 60, 40) });
    const mensaje = page.locator("textarea");
    await mensaje.focus();
    const segunda = await png(page, 50, 30);
    await mensaje.evaluate((elemento, base64) => {
        const datos = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
        const portapapeles = new DataTransfer();
        portapapeles.items.add(new File([datos], "pegada.png", { type: "image/png" }));
        elemento.dispatchEvent(new ClipboardEvent("paste", { clipboardData: portapapeles, bubbles: true, cancelable: true }));
    }, segunda.toString("base64"));
    await expect(page.locator("main")).toContainText("pegada.png");
});

test("metadatos: EXIF tras XMP, exposición legible y copia limpia que conserva la orientación", async ({ page }) => {
    await page.goto("/herramientas/metadatos");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "ñandú.jpg", mimeType: "image/jpeg", buffer: await jpegConExif(page) });
    const main = page.locator("main");
    await expect(main).toContainText("Pixel");
    await expect(main).toContainText("1/250 s");
    await expect(main).toContainText("Girada 90° a la derecha");
    await expect(main).toContainText("Exposición de privacidad");
    await page.getByRole("button", { name: "Limpiar imagen y eliminar metadatos" }).click();
    await expect(main).toContainText("Solo se conserva la orientación");
    const evento = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar", exact: true }).click();
    const descarga = await evento;
    expect(descarga.suggestedFilename()).toBe("ñandú_limpia.jpg");
    const limpia = await bytes(descarga);
    expect(limpia.includes(Buffer.from("Pixel", "latin1"))).toBe(false);
    expect(limpia.includes(Buffer.from("xmpmeta", "latin1"))).toBe(false);
    expect(limpia.includes(Buffer.from([0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0, 6]))).toBe(true);

    // Otra imagen sin EXIF: no queda el puntaje de la foto anterior.
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: await png(page, 40, 40) });
    await expect(main).toContainText("Al limpiar este PNG");
    await expect(main).not.toContainText("Exposición de privacidad");
});

test("convertir-ico conserva tildes y ñ en el nombre del archivo", async ({ page }) => {
    await page.goto("/herramientas/convertir-ico");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "logo ñandú.png", mimeType: "image/png", buffer: await png(page, 64, 64) });
    const descargar = page.getByRole("button", { name: "Descargar ICO", exact: true });
    await expect(descargar).toBeEnabled();
    const evento = page.waitForEvent("download");
    await descargar.click();
    expect((await evento).suggestedFilename()).toBe("logo-ñandú.ico");
});

test("favicon: las instrucciones del ZIP se leen como texto", async ({ page }) => {
    await page.goto("/herramientas/favicon");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await png(page, 256, 256) });
    const descargar = page.getByRole("button", { name: "Descargar ZIP" });
    await expect(descargar).toBeEnabled();
    const evento = page.waitForEvent("download");
    await descargar.click();
    const zip = await JSZip.loadAsync(await bytes(await evento));
    expect(zip.file("INSTRUCCIONES.html")).toBeNull();
    const texto = await zip.file("INSTRUCCIONES.txt")!.async("string");
    expect(texto).toContain("<head>");
    expect(texto).toContain('href="/favicon.ico"');
});

test("convertir: una imagen más grande que el límite dice qué hacer, no pide medidas que no existen", async ({ page }) => {
    await page.goto("/herramientas/convertir-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "panorama.png", mimeType: "image/png", buffer: await png(page, 16_001, 10) });
    const aviso = page.locator("main").getByRole("alert");
    await expect(aviso).toContainText("16.000 px por lado");
    await expect(aviso).toContainText("Achícala primero en Redimensionar");
});

test("comprimir y redimensionar conservan el formato de la foto: un JPEG sale en JPEG", async ({ page }) => {
    for (const [ruta, sufijo] of [["comprimir-imagen", "comprimida"], ["redimensionar", "redimensionada"]] as const) {
        await page.goto(`/herramientas/${ruta}`);
        await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: await jpegConExif(page) });
        await expect(page.getByRole("button", { name: "JPEG", exact: true })).toHaveAttribute("aria-pressed", "true");
        const descargar = page.getByRole("button", { name: "Descargar", exact: true });
        await expect(descargar).toBeEnabled();
        const evento = page.waitForEvent("download");
        await descargar.click();
        expect((await evento).suggestedFilename()).toBe(`foto_${sufijo}.jpg`);
    }
});

test("en el editor, soltar un archivo fuera del recuadro no abre la imagen en la pestaña", async ({ page }) => {
    await page.goto("/herramientas/convertir-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: await png(page, 120, 80) });
    await expect(page.getByRole("button", { name: "Descargar", exact: true })).toBeEnabled();
    const evitado = await page.locator("main").evaluate((elemento) => {
        const datos = new DataTransfer();
        datos.items.add(new File(["x"], "otra.png", { type: "image/png" }));
        const evento = new DragEvent("dragover", { dataTransfer: datos, bubbles: true, cancelable: true });
        elemento.dispatchEvent(evento);
        return evento.defaultPrevented;
    });
    expect(evitado).toBe(true);
});

test("paleta: el color «Dominante» es el de mayor porcentaje", async ({ page }) => {
    await page.goto("/herramientas/paleta-colores");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: await png(page, 320, 240) });
    const muestras = page.getByRole("button", { name: /^Seleccionar #[0-9a-f]{6}, \d+%$/ });
    await expect(muestras.first()).toBeVisible();
    const porcentajes = (await muestras.evaluateAll((botones) => botones.map((boton) => Number(/(\d+)%$/.exec(boton.getAttribute("aria-label") ?? "")?.[1] ?? -1))));
    expect(porcentajes.length).toBeGreaterThanOrEqual(2);
    expect([...porcentajes].sort((a, b) => b - a)).toEqual(porcentajes);
    await expect(page.locator("main")).toContainText("Dominante");
});
