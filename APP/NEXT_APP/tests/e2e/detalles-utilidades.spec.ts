import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";

/**
 * Revisión de detalles (20-11-2026): QR, claves, aleatorio, ASCII, banner, esteganografía, enlaces, IVA, binario y Base64.
 * Cada prueba fija algo que funcionaba «técnicamente» pero no como lo espera quien lo usa. Sin red externa.
 */
test.setTimeout(90_000);

async function png(page: Page, nombre = "prueba.png", ancho = 320, alto = 240) {
    const b64 = await page.evaluate(([w, h]) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const x = c.getContext("2d")!;
        x.fillStyle = "#101010"; x.fillRect(0, 0, w, h);
        x.fillStyle = "#ffffff"; x.fillRect(w / 4, h / 4, w / 2, h / 2);
        return c.toDataURL("image/png").split(",")[1];
    }, [ancho, alto]);
    return { name: nombre, mimeType: "image/png", buffer: Buffer.from(b64, "base64") };
}

async function leerQr(page: Page) {
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeEnabled();
    const pixeles = await page.locator('canvas[aria-label="Vista previa del código QR"]').evaluate((canvas: HTMLCanvasElement) => {
        const chico = document.createElement("canvas");
        chico.width = chico.height = 512;
        const ctx = chico.getContext("2d")!;
        ctx.drawImage(canvas, 0, 0, 512, 512);
        return Array.from(ctx.getImageData(0, 0, 512, 512).data);
    });
    return jsQR(new Uint8ClampedArray(pixeles), 512, 512)?.data;
}

test("aleatorio: el botón conserva el foco del teclado mientras gira y los bordes se dicen bien", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/herramientas/aleatorio");
    await page.locator("#aleatorio-lista").fill("Ana\nBeto\nCata");
    await page.getByLabel("Cantidad de ganadores").fill("2");
    await page.getByRole("button", { name: "Girar ruleta" }).focus();
    await page.keyboard.press("Enter");
    const girando = page.getByRole("button", { name: /^Girando/ });
    await expect(girando).toBeFocused();
    await expect(girando).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("button", { name: "Terminar ya" }).click();
    await expect(page.locator("body")).toContainText("2 ganadores, en orden");

    await page.locator("#aleatorio-lista").fill("Ana");
    await page.getByLabel("Cantidad de ganadores").fill("3");
    await expect(page.locator("#aleatorio-ganadores-ayuda")).toContainText("Hay 1 participante: sale ese.");
    await page.getByLabel("Cantidad de ganadores").fill("0");
    await page.getByLabel("Cantidad de ganadores").blur();
    await expect(page.getByLabel("Cantidad de ganadores")).toHaveValue("1");
});

test("impuestos: al quitar el IVA en pesos, neto + IVA da el total, y lo que no es monto se avisa", async ({ page }) => {
    await page.goto("/herramientas/impuestos");
    await page.getByRole("button", { name: "Quitar IVA" }).click();
    const monto = page.getByLabel("Monto bruto (con IVA)");
    // Antes: neto $40 + IVA $8 = $48 para un total de $47.
    await monto.fill("47");
    await expect(page.locator("body")).toContainText("47 ÷ 1,19 = 39");
    await expect(page.locator("body")).toContainText("+ $ 8");
    // Las letras ya no entran al campo (separador de miles, 23-11-2026): el campo queda vacío, sin cálculo.
    await monto.fill("abc");
    await expect(monto).toHaveValue("");
    await page.getByRole("button", { name: "Personalizado" }).click();
    await page.getByLabel("Tasa personalizada en porcentaje").fill("10.5");
    await monto.fill("100");
    await expect(page.locator("body")).toContainText("IVA (10,5%)");
});

test("qr: WiFi espera la contraseña y el código se lee con tildes y signos", async ({ page }) => {
    await page.goto("/herramientas/qr?tipo=wifi");
    await page.getByLabel("Nombre de la red (SSID)").fill("Café Ñuñoa");
    await expect(page.getByText("Falta la contraseña.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Descargar PNG", exact: true })).toBeDisabled();
    await page.getByLabel("Contraseña", { exact: true }).fill("año;2026");
    expect(await leerQr(page)).toBe("WIFI:S:Café Ñuñoa;T:WPA;P:año\\;2026;;");
    await page.getByLabel("Seguridad").selectOption("nopass");
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeDisabled();
});

test("qr: el enlace pegado con espacios no entra al código y el error de RA sale una sola vez", async ({ page }) => {
    await page.goto("/herramientas/qr");
    await page.getByLabel("Enlace", { exact: true }).fill("  ejemplo.cl/ruta  ");
    expect(await leerQr(page)).toBe("https://ejemplo.cl/ruta");

    await page.goto("/herramientas/qr?tipo=ar");
    await page.getByLabel("Modelo 3D · GLB / glTF", { exact: true }).fill("http://example.com/objeto.glb");
    await expect(page.getByRole("alert").filter({ hasText: "El modelo 3D debe ser" })).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "Revisa el contenido" })).toBeVisible();
});

test("claves: «sin ambiguos» también quita la barra vertical", async ({ page }) => {
    await page.goto("/herramientas/claves");
    await page.getByRole("button", { name: "Avanzado" }).click();
    await page.getByLabel(/Excluir caracteres que se confunden \(l, 1, I, \|, o, O, 0\)/).check();
    await page.getByRole("button", { name: "Paréntesis, corchetes y llaves" }).click();
    await page.getByRole("button", { name: "Otros signos de puntuación" }).click();
    await page.locator("#clave-largo").focus();
    await page.keyboard.press("End");
    for (let i = 0; i < 8; i++) {
        await page.getByRole("button", { name: "Generar otra clave" }).click();
        const clave = await page.locator("#clave-generada").innerText();
        expect(clave).toHaveLength(128);
        expect(clave).not.toMatch(/[l1I|oO0]/);
    }
});

test("banner ascii: tildes como letra base, aviso de lo que no se dibuja y números distintos en Banner", async ({ page }) => {
    await page.goto("/herramientas/banner-ascii");
    await expect(page.getByRole("button", { name: "Slant" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Big" })).toHaveCount(0);
    const campo = page.getByRole("textbox", { name: "Texto", exact: true });
    const vista = page.locator("pre").first();
    await campo.fill("¿Ñandú?");
    await expect(page.locator("#banner-faltan")).toContainText("«¿» «?»");
    await expect(vista).toContainText("|  \\| |");
    await page.getByRole("button", { name: "Banner", exact: true }).click();
    await campo.fill("0");
    const cero = await vista.innerText();
    await campo.fill("1");
    await expect(vista).not.toHaveText(cero);
});

test("esteganografía: el resultado viejo se borra al editar y un espacio invisible suelto no es un mensaje", async ({ page }) => {
    await page.goto("/herramientas/esteganografia");
    const secreto = page.getByRole("textbox", { name: /Mensaje Secreto/ });
    await secreto.fill("hola");
    await page.getByRole("button", { name: /Ocultar Mensaje/ }).click();
    await expect(page.getByText("Resultado (copia y comparte)")).toBeVisible();
    await secreto.fill("chao");
    await expect(page.getByText("Resultado (copia y comparte)")).toHaveCount(0);

    await page.getByRole("button", { name: /Decodificar/ }).click();
    await page.getByRole("textbox", { name: /Texto con Mensaje Oculto/ }).fill("hola​mundo");
    await page.getByRole("button", { name: /Revelar Mensaje/ }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("No se encontró ningún mensaje oculto");
});

test("enlaces: evento sin hora es de día completo, cruzar la medianoche termina al día siguiente y el mailto lleva @", async ({ page }) => {
    await page.goto("/herramientas/enlaces");
    await page.getByRole("button", { name: "Calendario" }).click();
    await page.getByLabel("Título del evento *").fill("Asado");
    await page.getByLabel("Fecha *").fill("2026-11-20");
    await expect(page.locator("body")).toContainText("dates=20261120/20261121");
    await expect(page.getByText("Sin hora de inicio: evento de día completo.")).toBeVisible();
    await expect(page.getByLabel("Fin", { exact: true })).toBeDisabled();
    await page.getByLabel("Inicio", { exact: true }).fill("22:00");
    await page.getByLabel("Fin", { exact: true }).fill("02:00");
    await expect(page.getByText("Termina al día siguiente")).toBeVisible();

    await page.getByRole("button", { name: "Email" }).click();
    await page.getByLabel("Destinatario").fill("ana@ejemplo.cl");
    await expect(page.locator("body")).toContainText("mailto:ana@ejemplo.cl");
});

test("binario: avisa los bits que sobran y lee bytes de 7 bits separados por espacios", async ({ page }) => {
    await page.goto("/herramientas/binario");
    await page.getByRole("button", { name: "Binario → Texto" }).click();
    const entrada = page.getByLabel("Binario de entrada");
    await entrada.fill("0100100001101111011");
    await expect(page.locator("body")).toContainText("Sobran 3 bits al final");
    await entrada.fill("1001000 1101111");
    await expect(page.getByRole("region", { name: "Resultado en texto" })).toHaveText("Ho");
});

test("base64: Base64 URL sin relleno se decodifica y los bytes que no son texto se avisan", async ({ page }) => {
    await page.goto("/herramientas/base64");
    await page.getByRole("button", { name: "Decodificar", exact: true }).click();
    const entrada = page.getByRole("textbox", { name: "Entrada", exact: true });
    const texto = "¿Qué tal? ñ 🌍";
    await entrada.fill(Buffer.from(texto).toString("base64url"));
    await expect(page.getByRole("textbox", { name: "Resultado", exact: true })).toHaveValue(texto);
    await entrada.fill("hola");
    await expect(page.locator("main").getByRole("alert")).toContainText("no es texto UTF-8");
});

test("ascii: ya no hay «Dirección del gradiente», que repetía a Invertir", async ({ page }) => {
    await page.goto("/herramientas/ascii");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await png(page));
    const vista = page.getByRole("region", { name: "Resultado en ASCII" }).locator("pre");
    await expect(vista).toContainText("@");
    await page.getByRole("button", { name: "Más opciones" }).click();
    await expect(page.getByText("Dirección del gradiente")).toHaveCount(0);
    const antes = await vista.innerText();
    await page.getByRole("button", { name: "Invertir" }).click();
    await expect(vista).not.toHaveText(antes);
});
