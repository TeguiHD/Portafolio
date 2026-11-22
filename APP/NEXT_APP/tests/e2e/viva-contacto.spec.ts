import { expect, test, type Page } from "@playwright/test";
import { PORTADA } from "./viva-utils";

const URL = PORTADA;
const MENSAJE = "Hola, necesito una página para mi negocio.";

async function abrir(page: Page) {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", /.+/); // ya hidrató
    await page.locator("#ct-abrir").click();
    await expect(page.locator("#ct-dialogo")).toHaveJSProperty("open", true);
}
async function llenar(page: Page) {
    await page.locator("#ct-correo").fill("a@b.cl");
    await page.locator("#ct-mensaje").fill(MENSAJE);
}

test.describe("Materia viva: contacto", () => {
    // El correo va en una sola línea (no se corta): en celulares angostos la píldora se salía por la derecha.
    for (const ancho of [320, 360, 390, 412]) {
        test(`a ${ancho} px la píldora del correo cabe entera y centrada, con el correo completo`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 800 });
            await page.goto(URL, { waitUntil: "domcontentloaded" });
            await page.evaluate(() => document.fonts.ready);
            const m = await page.locator("#copiar").evaluate((b) => {
                const r = b.getBoundingClientRect(), texto = b.querySelector("span")!;
                return { izq: r.left, der: innerWidth - r.right, cortado: texto.scrollWidth > texto.clientWidth + 1 };
            });
            expect(m.izq, "margen izquierdo").toBeGreaterThanOrEqual(12);
            expect(m.der, "margen derecho").toBeGreaterThanOrEqual(12);
            expect(Math.abs(m.izq - m.der), "centrada").toBeLessThanOrEqual(2);
            expect(m.cortado).toBe(false);
        });
    }

    test("«¿Cómo llegaste?» es opcional y viaja con el mensaje", async ({ page }) => {
        const cuerpos: Record<string, unknown>[] = [];
        await page.route("**/api/contact", (r) => { cuerpos.push(r.request().postDataJSON()); return r.fulfill({ json: { success: true } }); });
        await abrir(page);
        await expect(page.getByLabel(/¿Cómo llegaste/)).toHaveValue("");
        await llenar(page);
        await page.getByLabel(/¿Cómo llegaste/).selectOption({ label: "Me lo recomendó una IA (ChatGPT, Gemini, Claude…)" });
        await page.locator("#ct-enviar").click();
        await expect(page.locator(".avisos .aviso")).toContainText("Mensaje enviado");
        expect(cuerpos[0]!.origen).toBe("ia");
    });

    test("copiar el correo", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.goto(URL, { waitUntil: "domcontentloaded" });
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", /.+/);
        await page.locator("#copiar").click();
        await expect(page.locator(".avisos .aviso")).toContainText("Correo copiado");
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("contacto@nicoholas.dev");
    });

    test("el formulario envía lo mismo que antes", async ({ page }) => {
        const cuerpos: Record<string, unknown>[] = [];
        await page.route("**/api/contact", (r) => { cuerpos.push(r.request().postDataJSON()); return r.fulfill({ json: { success: true } }); });
        await abrir(page);
        await llenar(page);
        await page.locator("#ct-enviar").click();
        await expect(page.locator(".avisos .aviso")).toContainText("Mensaje enviado");
        await expect(page.locator("#ct-dialogo")).toHaveJSProperty("open", false);
        expect(cuerpos).toHaveLength(1);
        expect(cuerpos[0]).toMatchObject({ email: "a@b.cl", message: MENSAJE, website: "" });
        expect(typeof cuerpos[0].formStartTime).toBe("number");
        // El servidor descarta en silencio lo que llega antes de 3 s de abrir el formulario: el envío espera lo que falte.
        expect(Date.now() - (cuerpos[0].formStartTime as number)).toBeGreaterThanOrEqual(3000);
        await expect(page.locator("#ct-mensaje")).toHaveValue(""); // enviado: el formulario queda limpio
    });

    test("si falla o hay demasiados envíos, se entiende y no se pierde lo escrito", async ({ page }) => {
        let estado = 429, envios = 0;
        await page.route("**/api/contact", (r) => { envios++; return r.fulfill({ status: estado, json: { error: "x" } }); });
        await abrir(page);
        await llenar(page);
        await page.locator("#ct-enviar").dblclick(); // doble clic: un solo envío
        await expect(page.locator("#ct-fallo")).toHaveText("Recibí varios mensajes seguidos. Prueba de nuevo en una hora o escríbeme al correo.");
        expect(envios).toBe(1);
        await expect(page.locator("#ct-correo")).toHaveValue("a@b.cl");
        await expect(page.locator("#ct-mensaje")).toHaveValue(MENSAJE);
        await expect(page.locator("#ct-dialogo")).toHaveJSProperty("open", true);

        estado = 500;
        await page.locator("#ct-enviar").click();
        await expect(page.locator("#ct-fallo")).toHaveText("No pude enviar el mensaje. Prueba otra vez o escríbeme al correo.");
        await expect(page.locator("#ct-mensaje")).toHaveValue(MENSAJE);
    });

    test("no envía si falta el correo o el mensaje es muy corto, y se cierra con Escape", async ({ page }) => {
        let envios = 0;
        await page.route("**/api/contact", (r) => { envios++; return r.fulfill({ json: { success: true } }); });
        await abrir(page);
        await page.locator("#ct-mensaje").fill("Hola");
        await page.locator("#ct-enviar").click();
        await expect(page.locator("#ct-correo")).toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#ct-mensaje")).toHaveAttribute("aria-invalid", "true");
        expect(envios).toBe(0);
        await page.keyboard.press("Escape");
        await expect(page.locator("#ct-dialogo")).toHaveJSProperty("open", false);
        await expect(page.locator("#ct-abrir")).toBeFocused(); // el foco vuelve al botón que lo abrió
    });
});
