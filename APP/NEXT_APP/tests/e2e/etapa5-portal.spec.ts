import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 5 de «Materia viva»: el portal de clientes y las puertas del sitio (/cotizacion, /acceso, /cambiar-clave)
 * con el lenguaje del sitio. El documento de la propuesta conserva su diseño; solo cambia lo que lo rodea.
 *
 * Las pruebas con datos (lista, visor, código, vencido) necesitan la base de prueba sembrada con
 * sembrar-portal.ts: corren solo con PORTAL_PRUEBA=1 (nunca contra producción, donde los clientes son reales).
 */
const CON_DATOS = process.env.PORTAL_PRUEBA === "1";

async function sinCajasViejas(page: Page) {
    // Ni el degradado índigo ni el fondo pizarra del diseño anterior.
    const viejas = await page.locator('[class*="from-slate-950"], [class*="bg-slate-50 "], [class*="bg-slate-900"], [class*="to-indigo-950"]').count();
    expect(viejas).toBe(0);
}

test.describe("Etapa 5: portal y acceso", () => {
    test("el ingreso al portal va dentro del sitio, con campos etiquetados y clave que se puede mostrar", async ({ page }) => {
        await page.goto("/cotizacion?usuario=alguien");
        await expect(page.locator(".viva nav").first()).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tus documentos.");
        await expect(page.getByLabel("Usuario")).toHaveValue("alguien");
        // name estable + autocomplete: el gestor de contraseñas reconoce el formulario.
        await expect(page.getByLabel("Usuario")).toHaveAttribute("name", "username");
        await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("name", "password");
        const clave = page.getByLabel("Contraseña", { exact: true });
        await expect(clave).toHaveAttribute("type", "password");
        await page.getByRole("button", { name: "Mostrar contraseña" }).click();
        await expect(clave).toHaveAttribute("type", "text");
        // El botón ya no se deshabilita con los campos vacíos (Chrome rellena sin avisar y lo dejaba bloqueado): lo impide el «required».
        await expect(clave).toHaveAttribute("required", "");
        await sinCajasViejas(page);
    });

    test("el acceso al panel conserva el formulario (correo y clave) con el diseño nuevo", async ({ page }) => {
        await page.goto("/acceso");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel.");
        await expect(page.getByLabel("Correo")).toHaveAttribute("type", "email");
        await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("autocomplete", "current-password");
        await expect(page.getByRole("link", { name: "Volver al sitio" })).toHaveAttribute("href", "/");
        await expect(page.locator(".glass-panel")).toHaveCount(0);
    });

    test("cambiar la clave sin sesión manda al acceso", async ({ page }) => {
        await page.goto("/cambiar-clave");
        await expect(page).toHaveURL(/\/acceso/);
    });

    test("en tema claro las puertas usan el fondo claro del sitio", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("tema", "claro"));
        for (const ruta of ["/cotizacion", "/acceso"]) {
            await page.goto(ruta);
            const fondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
            expect(fondo, ruta).toBe("rgb(245, 244, 240)");
            const titulo = await page.getByRole("heading", { level: 1 }).evaluate((h) => getComputedStyle(h).color);
            expect(titulo, ruta).toBe("rgb(13, 19, 28)");
        }
    });

    test.describe("con datos de prueba", () => {
        test.skip(!CON_DATOS, "necesita la base de prueba sembrada (PORTAL_PRUEBA=1)");

        test("usuario y clave llevan a «Mis documentos»: lista en filas con folio, estado y acción", async ({ page }) => {
            await page.goto("/cotizacion");
            await page.getByLabel("Usuario").fill("Cliente Prueba");
            await page.getByLabel("Contraseña", { exact: true }).fill("clave-prueba-123");
            await page.getByRole("button", { name: "Entrar" }).click();
            await expect(page).toHaveURL(/\/cotizacion\/cliente-prueba$/);
            await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Cliente de Prueba.");
            const filas = page.locator(".po-fila");
            await expect(filas).toHaveCount(3);
            await expect(page.locator(".po-fila", { hasText: "2026-901" })).toContainText("Por firmar");
            await expect(page.locator(".po-fila", { hasText: "2026-901" })).toContainText("Revisar y firmar");
            await expect(page.locator(".po-fila", { hasText: "2026-903" })).toContainText("Disponible para leer");
            await sinCajasViejas(page);

            // El visor: barra nueva, documento intacto en su iframe y el panel de firma de siempre.
            await page.locator(".po-fila", { hasText: "2026-901" }).getByRole("link").click();
            await expect(page).toHaveURL(/\/cotizacion\/cliente-prueba\/sitio-web$/);
            await expect(page.getByRole("link", { name: /Mis documentos/ })).toHaveAttribute("href", "/cotizacion/cliente-prueba");
            await expect(page.frameLocator("iframe").getByRole("heading", { name: "Sitio web y tienda" })).toBeVisible();
            const marco = await page.locator("iframe").evaluate((f) => getComputedStyle(f).backgroundColor);
            expect(marco).toBe("rgb(255, 255, 255)");
            await page.getByRole("button", { name: /Firmar/ }).click();
            await expect(page.getByRole("dialog", { name: /Firmar propuesta/ })).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toHaveCount(0);

            // Compartir: menú con WhatsApp, correo y copiar.
            await page.getByRole("button", { name: "Compartir" }).click();
            await expect(page.getByRole("link", { name: "WhatsApp" })).toBeVisible();
            await expect(page.getByRole("button", { name: "Copiar enlace" })).toBeVisible();

            // Salir vuelve al ingreso.
            await page.goto("/cotizacion/cliente-prueba");
            await page.getByRole("button", { name: "Salir" }).click();
            await expect(page).toHaveURL(/\/cotizacion$/);
        });

        test("sin sesión, una propuesta pide su código; el código correcto abre el visor", async ({ page }) => {
            await page.goto("/cotizacion/cliente-prueba/sitio-web");
            await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sitio web y tienda");
            await page.getByLabel("Código de acceso").fill("NOPE99");
            await page.getByRole("button", { name: "Abrir la propuesta" }).click();
            await expect(page.getByRole("alert")).toBeVisible();
            await page.getByLabel("Código de acceso").fill("ABC123");
            await page.getByRole("button", { name: "Abrir la propuesta" }).click();
            await expect(page.frameLocator("iframe").getByRole("heading", { name: "Sitio web y tienda" })).toBeVisible();
        });

        test("un código vencido lo dice y ofrece entrar con usuario y contraseña", async ({ page }) => {
            await page.goto("/cotizacion/cliente-prueba/vencida");
            await expect(page.getByRole("heading", { level: 1 })).toHaveText("El código venció.");
            await expect(page.getByRole("link", { name: "Entrar con usuario y contraseña" })).toHaveAttribute("href", "/cotizacion?usuario=cliente-prueba");
        });
    });
});
