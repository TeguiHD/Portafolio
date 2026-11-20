import { expect, test, type Page } from "@playwright/test";

/** Tanda 2 (19-11-2026): funciones nuevas de las herramientas. Sin red externa (DNS solo valida la entrada). */
test.setTimeout(90_000);

async function png(page: Page, nombre = "prueba.png", ancho = 320, alto = 240) {
    const b64 = await page.evaluate(([w, h]) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const x = c.getContext("2d")!;
        x.fillStyle = "#1c7866"; x.fillRect(0, 0, w, h);
        x.fillStyle = "#edbd89"; x.fillRect(w / 4, h / 4, w / 2, h / 2);
        return c.toDataURL("image/png").split(",")[1];
    }, [ancho, alto]);
    return { name: nombre, mimeType: "image/png", buffer: Buffer.from(b64, "base64") };
}

test("regex: grupos con nombre, reemplazo y coincidencias vacías sin colgarse", async ({ page }) => {
    await page.goto("/herramientas/regex");
    await page.getByLabel("Expresión regular").fill("(?<anio>\\d{4})-(\\d{2})");
    await page.getByLabel("Texto de prueba").fill("2024-05 y 1999-12");
    await expect(page.locator("body")).toContainText("2 coincidencias");
    await expect(page.locator("body")).toContainText("«anio»");
    await page.locator("summary", { hasText: "Buscar y reemplazar" }).click();
    await page.getByLabel("Reemplazar con").fill("$2/$<anio> [$&]");
    await expect(page.getByRole("region", { name: "Texto con los reemplazos" })).toContainText("05/2024 [2024-05] y 12/1999 [1999-12]");
    await page.getByLabel("Expresión regular").fill("x*");
    await page.getByLabel("Texto de prueba").fill("abc");
    await expect(page.locator("body")).toContainText("4 coincidencias");
});

test("jwt: verifica la firma HS256 con el secreto correcto y la rechaza con otro", async ({ page }) => {
    await page.goto("/herramientas/jwt");
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    await page.getByLabel(/Pega tu token JWT/).fill(token);
    await page.getByLabel("Secreto compartido").fill("your-256-bit-secret");
    await page.getByRole("button", { name: "Verificar firma" }).click();
    await expect(page.locator("body")).toContainText("Firma válida");
    await page.getByLabel("Secreto compartido").fill("otro-secreto");
    await page.getByRole("button", { name: "Verificar firma" }).click();
    await expect(page.locator("body")).toContainText("Firma no válida");
});

test("json: avisa enteros que pierden precisión y claves repetidas; error con línea y columna", async ({ page }) => {
    await page.goto("/herramientas/json");
    const entrada = page.getByLabel("Entrada JSON");
    await entrada.fill('{"id": 12345678901234567890, "a": 1, "a": 2}');
    const avisos = page.getByRole("list", { name: "Avisos sobre el JSON" });
    await expect(avisos).toContainText("12345678901234567890");
    await expect(avisos).toContainText("clave repetida");
    await entrada.fill('{"a": 1,}');
    await expect(page.locator("body")).toContainText("Línea 1, columna 8");
});

test("subredes: VLSM asigna de mayor a menor y muestra el espacio libre", async ({ page }) => {
    await page.goto("/herramientas/subredes");
    await expect(page.getByRole("heading", { name: "Planificar subredes (VLSM)" })).toBeVisible();
    await expect(page.locator("body")).toContainText("192.168.10.0/25");
    await expect(page.locator("body")).toContainText("Espacio libre: 192.168.10.228/30, 192.168.10.232/29, 192.168.10.240/28");
    await page.getByLabel("Red base (CIDR)").fill("10.0.0.0/25");
    await expect(page.locator("body")).toContainText("No caben");
});

test("claves: frase de palabras con entropía calculada sobre la lista real", async ({ page }) => {
    await page.goto("/herramientas/claves");
    await page.getByRole("button", { name: /Frase de palabras/ }).click();
    await expect(page.locator("body")).toContainText("72 bits");
    await page.getByLabel(/Agregar un número/).uncheck();
    await expect(page.locator("body")).toContainText("63 bits");
});

test("unidades: lee la conversión desde la URL con coma decimal", async ({ page }) => {
    await page.goto("/herramientas/unidades?magnitud=velocidad&de=kmh&a=ms&valor=3,6");
    await expect(page.locator("body")).toContainText("Equivalencias de 3,6");
});

test("esteganografía: el detector encuentra invisibles y respeta los emojis compuestos", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/herramientas/esteganografia");
    await page.getByRole("button", { name: /Detectar/ }).click();
    await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
    await expect(page.locator("body")).toContainText("Hay 10 caracteres invisibles en 2 lugares.");
    await expect(page.locator("body")).toContainText("Texto escondido: «secreto»");
});

test("aleatorio: con «reducir movimiento» sortea 3 ganadores distintos al tiro", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/herramientas/aleatorio");
    await page.locator("#aleatorio-lista").fill("Ana\nBeto\nCata\nDani\nEli");
    await page.getByLabel("Cantidad de ganadores").fill("3");
    await page.getByRole("button", { name: "Girar ruleta" }).click();
    await expect(page.locator("body")).toContainText("3 ganadores, en orden");
    const nombres = await page.locator("ol li").allInnerTexts();
    const ganadores = nombres.map((t) => t.replace(/^\d+\.\s*/, "").trim()).filter((t) => ["Ana", "Beto", "Cata", "Dani", "Eli"].includes(t));
    expect(new Set(ganadores).size).toBe(3);
});

test("qr: avisa cuando el evento termina antes de empezar", async ({ page }) => {
    await page.goto("/herramientas/qr?tipo=event");
    await page.getByLabel("Título *").fill("Reunión");
    await page.getByLabel("Inicio *").fill("2026-11-19T14:30");
    await page.getByLabel("Término").fill("2026-11-19T10:00");
    await expect(page.getByRole("alert").filter({ hasText: "El evento termina antes de empezar" })).toBeVisible();
});

test("imágenes: el recuadro entrega blob: y comprimir llega a un peso objetivo o lo dice", async ({ page }) => {
    await page.goto("/herramientas/comprimir-imagen");
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles(await png(page));
    await expect(page.getByRole("button", { name: "Descargar", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.querySelector(".mesa-lienzo img")?.getAttribute("src") ?? "")).toMatch(/^blob:/);
    await page.getByLabel("Peso objetivo (KB)").fill("1");
    await expect(page.locator("body")).toContainText(/el objetivo era 1 KB|No se pudo llegar a 1 KB/);
});

test("imágenes: lote de 3 con descarga en ZIP", async ({ page }) => {
    await page.goto("/herramientas/convertir-imagen");
    const a = await png(page, "uno.png"), b = await png(page, "dos.png", 200, 100), c = await png(page, "uno.png", 100, 100);
    await page.getByLabel("Seleccionar imagen", { exact: true }).setInputFiles([a, b, c]);
    await expect(page.getByRole("list", { name: "Imágenes del lote" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByLabel("Avance del lote")).toHaveAttribute("value", "3", { timeout: 30_000 });
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar todo (ZIP)" }).click();
    expect((await descarga).suggestedFilename()).toMatch(/\.zip$/);
});

test("dns: la API rechaza tipos que no existen sin consultar nada", async ({ request }) => {
    const r = await request.get("/api/tools/dns?domain=ejemplo.cl&type=zzz");
    expect(r.status()).toBe(400);
});

test("regex: con el worker lento en llegar (red lenta) no se confunde con un retroceso catastrófico", async ({ page, context }) => {
    await page.goto("/herramientas/regex");
    // Desde aquí cada script nuevo (el worker se crea al escribir) tarda 1,5 s: más que el plazo de 500 ms.
    await context.route("**/_next/static/**/*.js", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await page.getByLabel("Expresión regular").fill("(\\d{4})");
    await page.getByLabel("Texto de prueba").fill("año 2024");
    await expect(page.locator("body")).toContainText("1 coincidencia", { timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("superó 500 ms");
});

test("aleatorio: con 3 ganadores la ruleta gira 3 veces, uno por giro, y «Terminar ya» completa el sorteo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/herramientas/aleatorio");
    await page.locator("#aleatorio-lista").fill("Ana\nBeto\nCata\nDani\nEli");
    await page.getByLabel("Cantidad de ganadores").fill("3");
    await expect(page.locator("#aleatorio-ganadores-ayuda")).toContainText("gira 3 veces");
    await page.getByRole("button", { name: "Girar ruleta" }).click();
    await expect(page.getByRole("button", { name: "Girando 1 de 3…" })).toBeVisible();
    // Termina el primer giro: sale el 1.º y la ruleta vuelve a girar por el 2.º.
    await expect(page.locator("body")).toContainText("Ganadores, en orden: 1 de 3", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Girando 2 de 3…" })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Terminar ya" }).click();
    await expect(page.locator("body")).toContainText("3 ganadores, en orden");
    const nombres = await page.locator("ol li").allInnerTexts();
    const ganadores = nombres.map((t) => t.replace(/^\d+\.\s*/, "").trim()).filter((t) => ["Ana", "Beto", "Cata", "Dani", "Eli"].includes(t));
    expect(new Set(ganadores).size).toBe(3);
    await expect(page.getByRole("button", { name: "Girar ruleta" })).toBeEnabled();
});
