import { expect, test, type Page } from "@playwright/test";
import { PORTADA } from "./viva-utils";

/** Detalles de uso de la portada y las páginas públicas (revisión del 20-11-2026). Sin red externa: /api/contact se simula. */

async function abrirFormulario(page: Page) {
    await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", /.+/); // ya hidrató
    await page.getByRole("button", { name: "Escribirme un mensaje" }).click();
    await expect(page.getByRole("dialog", { name: "Escríbeme" })).toBeVisible();
}

test.describe("Detalles: contacto", () => {
    test("un mensaje de puros espacios no gasta un envío y se explica en español", async ({ page }) => {
        let envios = 0;
        await page.route("**/api/contact", (r) => { envios++; return r.fulfill({ json: { success: true } }); });
        await abrirFormulario(page);
        await page.getByLabel("Correo", { exact: true }).fill("a@b.cl");
        await page.getByLabel(/^Mensaje/).fill("            a");
        await page.getByRole("button", { name: "Enviar" }).click();
        await expect(page.locator("#ct-fallo")).toHaveText("Cuéntame un poco más: al menos 10 caracteres, sin contar los espacios.");
        await expect(page.getByLabel(/^Mensaje/)).toBeFocused();
        expect(envios).toBe(0);
        // Al corregir, el motivo viejo se borra.
        await page.getByLabel(/^Mensaje/).pressSequentially(" más texto");
        await expect(page.locator("#ct-fallo")).toHaveText("");
    });

    test("el tope de 2.000 caracteres se anuncia y se ve cerca del final", async ({ page }) => {
        await abrirFormulario(page);
        await expect(page.getByLabel("Mensaje hasta 2.000 caracteres")).toBeVisible();
        const mensaje = page.getByLabel(/^Mensaje/);
        await mensaje.fill("x".repeat(1500));
        await expect(page.locator(".ct-cuenta")).toHaveCount(0);
        await mensaje.fill("x".repeat(1850));
        await expect(page.locator(".ct-cuenta")).toHaveText("1.850 de 2.000");
        await mensaje.fill("x".repeat(2000));
        await expect(page.locator(".ct-cuenta")).toHaveText("Llegaste al máximo: lo que escribas o pegues de más no entra.");
        await expect(page.getByRole("status").filter({ hasText: "Llegaste al máximo de 2.000 caracteres." })).toHaveCount(1);
    });

    test("un error del envío no queda pegado al volver a abrir el formulario", async ({ page }) => {
        await page.route("**/api/contact", (r) => r.fulfill({ status: 500, json: { error: "x" } }));
        await abrirFormulario(page);
        await page.getByLabel("Correo", { exact: true }).fill("a@b.cl");
        await page.getByLabel(/^Mensaje/).fill("Hola, necesito una página para mi negocio.");
        await page.getByRole("button", { name: "Enviar" }).click();
        await expect(page.locator("#ct-fallo")).toHaveText("No pude enviar el mensaje. Prueba otra vez o escríbeme al correo.");
        await page.getByRole("button", { name: "Cerrar" }).click();
        await page.getByRole("button", { name: "Escribirme un mensaje" }).click();
        await expect(page.locator("#ct-fallo")).toHaveText("");
        await expect(page.getByLabel(/^Mensaje/)).toHaveValue("Hola, necesito una página para mi negocio.");
    });

    test("si no se puede copiar, el aviso lo dice en vez de dar el visto bueno", async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("bloqueado")) }, configurable: true });
        });
        await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", /.+/);
        await page.getByRole("button", { name: "Copiar el correo contacto@nicoholas.dev" }).click();
        const aviso = page.locator(".avisos .aviso");
        await expect(aviso).toHaveText("No se pudo copiar: contacto@nicoholas.dev");
        await expect(aviso.locator("svg")).toHaveCount(0);
    });
});

test.describe("Detalles: hero", () => {
    test("las opciones se recorren con las flechas y no rotan con el cursor encima", async ({ page }) => {
        await page.goto(PORTADA);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "figuras");
        const lista = page.getByRole("tablist", { name: "Lo que construyo" });
        const pestanas = lista.getByRole("tab");
        await pestanas.first().click(); // fija la primera: así la flecha parte de ella aunque ya hubiera rotado
        await page.keyboard.press("ArrowRight");
        await expect(lista.getByRole("tab", { name: "Sistemas internos" })).toBeFocused();
        await expect(lista.getByRole("tab", { name: "Sistemas internos" })).toHaveAttribute("aria-selected", "true");
        await expect(pestanas.nth(0)).toHaveAttribute("tabindex", "-1");
        // Con el cursor encima no cambia sola, aunque pasen los 14 s de la elección. El foco sale antes: se prueba solo el cursor.
        await page.keyboard.press("ArrowRight");
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await lista.getByRole("tab", { name: "Herramientas" }).hover();
        await page.waitForTimeout(15_000);
        await expect(lista.getByRole("tab", { name: "Herramientas" })).toHaveAttribute("aria-selected", "true");
    });
});

test.describe("Detalles: páginas públicas", () => {
    test("el 404 abierto en una pestaña nueva: «Volver atrás» lleva al inicio en vez de no hacer nada", async ({ page }) => {
        await page.goto("/esta-ruta-no-existe");
        await page.getByRole("button", { name: "Volver atrás" }).click();
        await expect(page).toHaveURL(/\/$/);
    });

    test("«Volver al inicio» del pie sube también el foco", async ({ page }) => {
        await page.goto(PORTADA);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.getByRole("link", { name: "Volver al inicio" }).last().focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#contenido")).toBeFocused();
    });

    test("sobre mí: las categorías del stack van en español", async ({ page }) => {
        await page.goto("/sobre-mi");
        const stack = page.locator("#stack");
        await expect(stack.getByText("Base de datos")).toHaveCount(1);
        await expect(stack.getByText(/Database|Automation|Animation/)).toHaveCount(0);
    });

    test("el botón de ayuda para instalar no repite su id entre el menú y el pie", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
        const page = await ctx.newPage();
        await page.goto("/");
        const botones = page.locator("button", { hasText: "Agregar al inicio" }); // el del menú está oculto hasta abrirlo
        await expect(botones).toHaveCount(2);
        const ids = await botones.evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-controls")));
        expect(new Set(ids).size).toBe(2);
        await ctx.close();
    });
});
