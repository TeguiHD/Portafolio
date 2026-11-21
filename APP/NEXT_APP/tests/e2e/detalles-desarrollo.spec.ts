import { expect, test } from "@playwright/test";

/** Detalles de uso (20-11-2026): catálogo, herramientas de desarrollo y redes, y /ar. Sin red externa. */
test.describe("Catálogo de herramientas", () => {
    test("«codigo qr» sin tilde encuentra el generador de QR", async ({ page }) => {
        await page.goto("/herramientas");
        await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("codigo qr");
        await expect(page.getByRole("link", { name: "Generador de QR", exact: true })).toBeVisible();
        await page.getByRole("searchbox", { name: "Buscar herramientas" }).fill("Código QR");
        await expect(page.getByRole("link", { name: "Generador de QR", exact: true })).toBeVisible();
    });

    test("al volver desde una herramienta, el filtro sigue puesto", async ({ page }) => {
        await page.goto("/herramientas");
        await page.getByRole("group", { name: "Filtrar por categoría" }).getByRole("button", { name: /^Redes/ }).click();
        await page.getByRole("link", { name: "Calculadora de subredes", exact: true }).click();
        await expect(page).toHaveURL(/\/herramientas\/subredes$/);
        await page.goBack();
        await expect(page.getByRole("group", { name: "Filtrar por categoría" }).getByRole("button", { name: /^Redes/ })).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Limpiar filtros" })).toBeVisible();
    });
});

test.describe("Herramientas de desarrollo", () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

    test("jwt: acepta el token entre comillas o con «Authorization: Bearer» y avisa un exp que no es número", async ({ page }) => {
        const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "1", exp: "mañana" })}.firma`;
        await page.goto("/herramientas/jwt");
        const campo = page.getByLabel("Pega tu token JWT:");
        await campo.fill(`"${token}"`);
        await expect(page.locator("body")).toContainText("no es un número");
        await campo.fill(`Authorization: Bearer ${token}`);
        await expect(page.locator("body")).toContainText("Payload (Claims)");
        await campo.fill(`${b64({ alg: "HS256" })}.no-es-json.firma`);
        await expect(page.getByRole("alert").filter({ hasText: "El payload no es JSON válido" })).toBeVisible();
    });

    test("json: un BOM invisible al inicio no rompe la validación", async ({ page }) => {
        await page.goto("/herramientas/json");
        await page.getByLabel("Entrada JSON").fill('﻿{"a": 1}');
        await expect(page.getByRole("status").filter({ hasText: "JSON válido" })).toBeVisible();
        await expect(page.getByRole("list", { name: "Avisos sobre el JSON" })).toContainText("marca BOM");
    });

    test("subredes: «192.168.100.0/24» pegado o tecleado no se corta en /2, y un /31 no inventa broadcast", async ({ page }) => {
        await page.goto("/herramientas/subredes");
        const ip = page.getByPlaceholder("192.168.1.0");
        const prefijo = page.getByRole("spinbutton", { name: "Prefijo CIDR" });
        await ip.fill("192.168.100.0/24");
        await expect(prefijo).toHaveValue("24");
        await expect(page.locator("body")).toContainText("192.168.100.255");
        await ip.fill("");
        await ip.pressSequentially("10.0.0.0/8");
        await expect(ip).toHaveValue("10.0.0.0/8");
        await expect(prefijo).toHaveValue("8");
        await expect(page.locator("body")).toContainText("10.255.255.255");
        await prefijo.fill("31");
        await expect(ip).toHaveValue("10.0.0.0");
        await expect(page.locator("body")).toContainText("No tiene en un /31");
        await prefijo.fill("33");
        await expect(page.locator("body")).toContainText("El prefijo IPv4 va de 0 a 32.");
    });

    test("subredes: una IPv6 con «:» suelto al inicio no es válida", async ({ page }) => {
        await page.goto("/herramientas/subredes");
        await page.getByPlaceholder("192.168.1.0").fill(":1:2:3:4:5:6:7");
        await expect(page.locator("body")).toContainText("IPv6 no válida");
    });

    test("dns: un nombre .localhost se rechaza en el navegador, sin consultar", async ({ page }) => {
        await page.goto("/herramientas/dns");
        await page.getByLabel("Dominio o IP").fill("mi.localhost");
        await page.getByRole("button", { name: "Verificar propagación" }).click();
        await expect(page.getByRole("alert").filter({ hasText: "Dominio inválido" })).toBeVisible();
    });

    test("nginx: un destino con ruta no se repite en el location de estáticos y un dominio vacío no deja «server_name ;»", async ({ page }) => {
        await page.goto("/herramientas/nginx");
        await page.getByRole("switch", { name: "Reverse Proxy" }).click();
        await page.getByLabel("Proxy Pass").fill("http://127.0.0.1:3000/app/");
        await page.getByLabel("Dominio").fill("");
        const salida = page.getByRole("region", { name: "Configuración generada" });
        await expect(salida).toContainText("proxy_pass http://127.0.0.1:3000/app/;");
        await expect(salida).toContainText("proxy_pass http://127.0.0.1:3000;");
        await expect(salida).toContainText("server_name _;");
        await expect(page.getByRole("list", { name: "Avisos sobre la configuración" })).toContainText("Sin dominio");
    });
});

test("ar: un enlace con ?utm_source= muestra la guía, no «enlace no válido»", async ({ page }) => {
    await page.goto("/ar?utm_source=instagram");
    await expect(page.getByRole("heading", { level: 1, name: "QR con realidad aumentada" })).toBeVisible();
});
