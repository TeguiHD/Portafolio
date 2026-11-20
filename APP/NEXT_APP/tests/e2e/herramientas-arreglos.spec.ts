import { expect, test } from "@playwright/test";

/** Arreglos de la tanda 1 (auditoría del 19-11-2026): cada prueba fija un fallo que ya estaba en producción. */
test.describe("Herramientas: arreglos de la tanda 1", () => {
    test("binario: UTF-8 real y el campo no se llena de &amp;", async ({ page }) => {
        await page.goto("/herramientas/binario");
        const campo = page.locator("textarea").first();
        await campo.fill("ñ&");
        await expect(campo).toHaveValue("ñ&");
        await expect(page.locator("body")).toContainText("11000011 10110001 00100110");
    });

    test("impuestos: «1.190.000» es un millón ciento noventa mil y los pesos van sin decimales", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        await page.getByPlaceholder("0").first().fill("1.190.000");
        await expect(page.locator("body")).toContainText("1.416.100");
    });

    test("subredes: una IP de loopback no sale como pública", async ({ page }) => {
        await page.goto("/herramientas/subredes");
        await page.getByPlaceholder("192.168.1.0").fill("127.0.0.1");
        await expect(page.locator("body")).toContainText("Loopback");
    });

    test("jwt: acepta «Bearer», y un iat pasado no dice «expirado»", async ({ page }) => {
        const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
        const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "1", iat: 1516239022, exp: 4102444800 })}.firma`;
        await page.goto("/herramientas/jwt");
        await page.locator("textarea").first().fill(`Bearer ${token}`);
        await expect(page.locator("body")).toContainText("(emitido)");
        await expect(page.locator("body")).not.toContainText(/expirado/i);
    });

    test("enlaces: el mensaje de WhatsApp no se escapa como HTML y el número chileno recibe el 56", async ({ page }) => {
        await page.goto("/herramientas/enlaces");
        await page.getByPlaceholder("+56 9 1234 5678").fill("912345678");
        await page.getByPlaceholder("Hola, me gustaría...").fill("Hola & chao/x");
        await expect(page.locator("body")).toContainText("wa.me/56912345678?text=Hola%20%26%20chao%2Fx");
        await expect(page.locator("body")).not.toContainText("%26amp%3B");
    });

    test("nginx: el interruptor de SSL funciona y la configuración es vigente", async ({ page }) => {
        await page.goto("/herramientas/nginx");
        const ssl = page.getByRole("switch", { name: "Habilitar SSL" });
        await expect(ssl).toHaveAttribute("aria-checked", "false");
        await ssl.click();
        await expect(ssl).toHaveAttribute("aria-checked", "true");
        const salida = page.locator("pre").first();
        await expect(salida).toContainText("listen 443 ssl;");
        await expect(salida).toContainText("http2 on;");
        await expect(salida).not.toContainText("X-XSS-Protection");
        await page.getByRole("switch", { name: "Reverse Proxy" }).click();
        await expect(salida).toContainText("proxy_set_header Connection $connection_upgrade;");
    });
});
