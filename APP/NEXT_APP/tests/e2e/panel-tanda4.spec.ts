import { existsSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Panel, tanda 4 (19-11-2026): flujos de Comercial, Visitas, menú y diálogos. Reutiliza la sesión que deja
 * panel-etapa1.spec.ts (correr ese archivo antes, en la misma pasada). Sin esa sesión se salta: nunca contra producción.
 */
const ESTADO = "test-results/panel-sesion.json";
// Se revisa al correr cada prueba (Playwright vacía test-results al empezar: la sesión aparece durante la pasada).
test.beforeEach(() => test.skip(!existsSync(ESTADO), "necesita la sesión de panel-etapa1.spec.ts"));

async function abrir(browser: Browser, ancho = 1440): Promise<Page> {
    const ctx = await browser.newContext({ storageState: ESTADO, viewport: { width: ancho, height: ancho > 900 ? 900 : 844 } });
    return ctx.newPage();
}

test("menú: Finanzas sale de Comercial y Contratos reemplaza a Servicios", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin");
    const riel = page.getByRole("navigation").first();
    await expect(riel.getByRole("group", { name: "Personal" }).getByRole("link", { name: "Finanzas" })).toBeVisible();
    await expect(riel.getByRole("group", { name: "Comercial" }).getByRole("link", { name: "Contratos" })).toBeVisible();
    await expect(riel.getByRole("group", { name: "Comercial" }).getByRole("link", { name: "Finanzas" })).toHaveCount(0);
});

test("clientes: la ruta vieja redirige al directorio único", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/gestion-comercial/clientes");
    await expect(page).toHaveURL(/\/admin\/clientes$/);
});

test("pagos: «Registrar pago» abre un formulario de verdad", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/gestion-comercial/pagos");
    await page.getByRole("button", { name: "Registrar pago" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Registrar pago" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByLabel("Monto (CLP)")).toBeVisible();
});

test("visitas: título en español y la misma cifra que «Hoy» a 30 días", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin");
    const enHoy = (await page.locator("dl.hoy-cifras div", { hasText: /^visitas/ }).locator("dd").innerText()).match(/^[\d.]+/)![0];
    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Visitas");
    await page.getByRole("button", { name: "30 días" }).click();
    await expect(page.locator(".ad-contenido")).toContainText(enHoy);
});

test("oportunidades: en celular no hay desplazamiento lateral", async ({ browser }) => {
    const page = await abrir(browser, 390);
    await page.goto("/admin/gestion-comercial/pipeline");
    await expect(page.getByLabel("Etapa", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("servidor: pestañas en español", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/superadmin");
    await expect(page.getByRole("tab", { name: "Resumen" }).or(page.getByRole("button", { name: "Resumen" }))).toBeVisible();
});
