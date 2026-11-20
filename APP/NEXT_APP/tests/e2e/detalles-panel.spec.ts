import { existsSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Detalles del panel (20-11-2026): lo que funcionaba «técnicamente» pero no como lo usa el dueño. Reutiliza la sesión
 * que deja panel-etapa1.spec.ts (correr ese archivo antes, en la misma pasada). Solo lee o abre y cierra ventanas:
 * no crea ni borra nada. Sin esa sesión se salta: nunca contra producción.
 */
const ESTADO = "test-results/panel-sesion.json";
test.beforeEach(() => test.skip(!existsSync(ESTADO), "necesita la sesión de panel-etapa1.spec.ts"));

async function abrir(browser: Browser, ancho = 1440): Promise<Page> {
    const ctx = await browser.newContext({ storageState: ESTADO, viewport: { width: ancho, height: ancho > 900 ? 900 : 844 } });
    return ctx.newPage();
}

test("auditoría: «Hoy» muestra lo de hoy (antes pedía de medianoche a medianoche y salía vacío)", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/audit");
    await page.getByRole("button", { name: "Hoy" }).click();
    // La sesión de prueba entró hoy: al menos ese registro tiene que aparecer.
    await expect(page.getByText("No se encontraron registros")).toHaveCount(0);
});

test("propuestas: el asistente crea el cliente sin salir de la ventana", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/cotizaciones");
    await page.getByRole("button", { name: "Nueva propuesta" }).first().click();
    const asistente = page.getByRole("dialog", { name: "Nueva propuesta" });
    await asistente.getByRole("button", { name: "Cliente nuevo" }).click();
    const nuevo = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(nuevo).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/cotizaciones$/);
    await nuevo.getByRole("button", { name: "Cancelar" }).click();
    await expect(asistente).toBeVisible();
});

test("propuestas: «Pegar HTML» pide el total (sin él la propuesta quedaba en $0 y no admitía pagos)", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/cotizaciones");
    await page.getByRole("button", { name: "Nueva propuesta" }).first().click();
    const asistente = page.getByRole("dialog", { name: "Nueva propuesta" });
    const clientes = asistente.getByRole("list").getByRole("button");
    test.skip((await clientes.count()) === 0, "no hay clientes sembrados");
    await clientes.first().click();
    await page.getByRole("button", { name: /Pegar HTML/ }).click();
    const total = page.getByRole("dialog", { name: "Pegar HTML" }).getByLabel("Total (CLP)");
    await total.fill("1190000");
    await expect(total).toHaveValue("1.190.000");
});

test("contratos: «Crear contrato» desde una oportunidad ganada abre el formulario con sus datos", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/gestion-comercial/contratos?nuevo=1&titulo=Sitio%20web&valor=150000");
    const dialogo = page.getByRole("dialog", { name: "Nuevo contrato" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByLabel("Título *")).toHaveValue("Sitio web");
    await expect(dialogo.getByLabel("Valor total (CLP)")).toHaveValue("150.000");
    // El aviso se puede ajustar aunque no se renueve solo (antes se escondía y quedaba en 30 días).
    await expect(dialogo.getByLabel("Avisar")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/gestion-comercial\/contratos$/);
});

test("finanzas: el saldo inicial acepta montos a la chilena («1.250.000»)", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/finance/accounts");
    await page.getByRole("button", { name: "Nueva cuenta" }).click();
    const saldo = page.getByRole("dialog", { name: "Nueva cuenta" }).getByLabel("Saldo inicial");
    await saldo.fill("1.250.000");
    await expect(saldo).toHaveValue("1.250.000");
});

test("usuarios: en la fila de un superadmin no hay acciones que la API rechazaría", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin/users");
    const propia = page.getByRole("listitem").filter({ has: page.getByText("Protegido") }).first();
    await expect(propia).toBeVisible();
    await expect(propia.getByRole("button", { name: "Eliminar usuario" })).toHaveCount(0);
    await expect(propia.getByRole("button", { name: "Cambiar contraseña" })).toHaveCount(0);
});
