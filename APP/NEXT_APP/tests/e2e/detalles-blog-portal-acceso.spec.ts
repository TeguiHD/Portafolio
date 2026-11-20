import { test, expect, type Page } from "@playwright/test";

/**
 * Detalles de uso del blog, el portal y el acceso (revisión del 20-11-2026).
 * Lo que depende de terceros desde el navegador (tiempo, mercado, inicio de sesión) se responde con page.route:
 * las pruebas no salen a la red. El service worker se bloquea para que page.route vea todas las peticiones.
 */
test.use({ serviceWorkers: "block" });
test.setTimeout(90_000);

test.describe("Blog", () => {
  test("sin JavaScript llegan todos los titulares, no solo los doce que muestra «Ver más»", async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    // El botón «Todo» lleva el total de titulares del día.
    const total = Number((await page.locator("#bp-temas button").first().locator("small").textContent())?.trim());
    expect(total).toBeGreaterThan(0);
    await expect(page.locator(".bp-fila")).toHaveCount(total);
    await contexto.close();
  });

  test("con JavaScript el resto de los titulares no se cuela: siguen siendo doce como mucho", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator(".bp-fila").first()).toBeVisible();
    expect(await page.locator(".bp-fila").count()).toBeLessThanOrEqual(12);
  });

  test("la cápsula del tiempo dice cuando la ciudad escrita no existe", async ({ page }) => {
    await page.route(/\/api\/pulse\/context\?city=Atlantida$/, (ruta) =>
      ruta.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "No encontré esa ciudad." }) }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/blog");
    await page.locator(".cp-pildora").click();
    const panel = page.getByRole("dialog", { name: "Tiempo y hora" });
    await panel.getByLabel("Ciudad").fill("Atlantida");
    await panel.getByRole("button", { name: "Ver", exact: true }).click();
    await expect(panel.getByRole("status")).toHaveText("No encontré «Atlantida». Prueba con otro nombre.");
  });

  test("el mercado: tras un fallo, al reabrir vuelve a pedir; los porcentajes van con coma", async ({ page }) => {
    let falla = true;
    await page.route(/\/api\/pulse\/cripto$/, (ruta) => falla
      ? ruta.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "las fuentes de mercado no responden" }) })
      : ruta.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          monedas: [{
            id: "bitcoin", simbolo: "BTC", nombre: "Bitcoin", imagen: "", precio: 95123.4, cambio24h: 1.234,
            capitalizacion: 1, volumen: 1, maximo24h: 1, minimo24h: 1, chispa: [1, 2, 3],
          }],
        }),
      }));
    await page.goto("/blog");
    const abrir = page.getByRole("button", { name: "Ver el mercado" });
    await abrir.click();
    const dialogo = page.getByRole("dialog", { name: "Mercado de criptomonedas" });
    await expect(dialogo.getByText("La fuente de mercado no responde ahora mismo.", { exact: false })).toBeVisible();
    await dialogo.getByRole("button", { name: "Cerrar" }).click();
    falla = false;
    await abrir.click();
    await expect(dialogo.getByText("+1,23%")).toBeVisible();
    await expect(dialogo.getByText("La fuente de mercado no responde ahora mismo.", { exact: false })).toHaveCount(0);
  });
});

/** Responde el inicio de sesión de next-auth con el código que se quiera, sin tocar la base. */
async function responderIngreso(page: Page, codigos: string[]) {
  let vez = 0;
  await page.route(/\/api\/auth\/callback\/credentials/, (ruta) => {
    const codigo = codigos[Math.min(vez++, codigos.length - 1)];
    return ruta.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: `http://localhost/acceso?error=CredentialsSignin&code=${codigo}` }),
    });
  });
  await page.route(/\/api\/audit\/event/, (ruta) => ruta.fulfill({ status: 204, body: "" }));
}

test.describe("Acceso al panel", () => {
  test("una clave mala deja el error escrito y el foco en la contraseña", async ({ page }) => {
    await responderIngreso(page, ["credentials"]);
    await page.goto("/acceso");
    await page.getByLabel("Correo").fill("alguien@ejemplo.cl");
    await page.getByLabel("Contraseña", { exact: true }).fill("no-es-esta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".pa-error")).toHaveText("El correo o la contraseña no coinciden. Tras varios intentos seguidos, el acceso se pausa unos minutos.");
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeFocused();
  });

  test("un código de 2FA malo se borra y se puede reintentar sin borrar a mano", async ({ page }) => {
    await responderIngreso(page, ["mfa_required", "mfa_invalid"]);
    await page.goto("/acceso");
    await page.getByLabel("Correo").fill("alguien@ejemplo.cl");
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-buena");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Un paso más.");
    const codigo = page.getByLabel("Código de tu app autenticadora");
    // Pegado con espacios, como lo copian algunas apps: quedan los seis dígitos.
    await codigo.fill("123 456");
    await expect(codigo).toHaveValue("123456");
    await page.getByRole("button", { name: "Verificar y entrar" }).click();
    await expect(page.locator(".pa-error")).toHaveText("El código no coincide. Escribe el que muestra ahora tu app (cambia cada 30 segundos).");
    await expect(codigo).toHaveValue("");
    await expect(codigo).toBeFocused();
  });

  test("el botón de mostrar la contraseña tiene un nombre fijo y dice su estado", async ({ page }) => {
    await page.goto("/acceso");
    const ver = page.getByRole("button", { name: "Mostrar contraseña" });
    await expect(ver).toHaveAttribute("aria-pressed", "false");
    await ver.click();
    await expect(ver).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");
  });
});

test.describe("Portal del cliente", () => {
  test("el ingreso no deja el botón bloqueado: con campos vacíos lo frena el navegador", async ({ page }) => {
    await page.goto("/cotizacion");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
    await expect(page.getByLabel("Usuario")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("required", "");
  });
});
