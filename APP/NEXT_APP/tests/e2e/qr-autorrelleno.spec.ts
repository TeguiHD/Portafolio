import { expect, test } from "@playwright/test";
import QRCode from "qrcode";
import { formatWiFi } from "../../src/utils/qr-data-formats";
import { leerWifi, separarNombre } from "../../src/lib/tools/qr-autorrelleno";

/**
 * QR que se llena solo: la ubicación actual (con permiso), un contacto del teléfono (Contact Picker, Android) y una red
 * Wi-Fi leída desde el QR que el propio celular muestra al «Compartir» la red (ningún navegador deja leer la clave del
 * Wi-Fi: lo más rápido de verdad es leer ese QR).
 */
test.describe("sin navegador", () => {
    test("lee un QR de Wi-Fi con caracteres escapados, red oculta y sin contraseña", () => {
        expect(leerWifi("WIFI:S:Mi Casa;T:WPA;P:clave\\;123;H:true;;")).toEqual({ ssid: "Mi Casa", encryption: "WPA", password: "clave;123", hidden: true });
        expect(leerWifi("WIFI:T:nopass;S:Libre;;")).toEqual({ ssid: "Libre", encryption: "nopass" });
        expect(leerWifi("WIFI:T:SAE;S:Oficina;P:x;;")?.encryption).toBe("WPA"); // WPA3 (SAE) y WPA2 se escriben como WPA
        expect(leerWifi("https://nicoholas.dev")).toBeNull();
        expect(leerWifi("WIFI:T:WPA;;")).toBeNull(); // sin nombre de red no sirve
    });

    test("ida y vuelta: lo que genera la herramienta se vuelve a leer igual", () => {
        const red = { ssid: 'Casa Pérez; 2,4: "GHz"', encryption: "WPA" as const, password: 'c\\l;a,v:e"' };
        expect(leerWifi(formatWiFi(red))).toEqual(red);
    });

    test("separa el nombre de un contacto en nombre y apellido", () => {
        expect(separarNombre("Ana María Pérez")).toEqual({ nombre: "Ana María", apellido: "Pérez" });
        expect(separarNombre("Cristóbal")).toEqual({ nombre: "Cristóbal", apellido: "" });
        expect(separarNombre("  ")).toEqual({ nombre: "", apellido: "" });
    });
});

test.describe("en la página", () => {
    test("solo el QR puede pedir la ubicación: el resto del sitio la sigue bloqueando", async ({ request }) => {
        const qr = (await request.get("/herramientas/qr")).headers()["permissions-policy"] ?? "";
        const portada = (await request.get("/")).headers()["permissions-policy"] ?? "";
        expect(qr).toContain("geolocation=(self)");
        expect(portada).toContain("geolocation=()");
    });

    test("ubicación: «Usar mi ubicación actual» llena las coordenadas", async ({ browser }) => {
        const ctx = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: -20.2141, longitude: -70.1524, accuracy: 12 } });
        const page = await ctx.newPage();
        await page.goto("/herramientas/qr?tipo=location");
        await page.getByRole("button", { name: "Usar mi ubicación actual" }).click();
        await expect(page.getByLabel("Latitud")).toHaveValue("-20.2141");
        await expect(page.getByLabel("Longitud")).toHaveValue("-70.1524");
        await expect(page.locator("#tools-content")).toContainText("±12 m");
        await ctx.close();
    });

    test("ubicación: si se niega el permiso, se dice qué hacer (sin romper el formulario)", async ({ browser }) => {
        const ctx = await browser.newContext({ permissions: [] });
        const page = await ctx.newPage();
        await page.goto("/herramientas/qr?tipo=location");
        await page.getByRole("button", { name: "Usar mi ubicación actual" }).click();
        await expect(page.locator("#tools-content").getByRole("alert")).toContainText(/permiso/i);
        await expect(page.getByLabel("Dirección o nombre del lugar")).toBeEnabled();
        await ctx.close();
    });

    test("Wi-Fi: leer la captura del QR de la red llena el nombre, la clave y la seguridad", async ({ page }) => {
        const texto = formatWiFi({ ssid: "Casa Pérez; 2,4", encryption: "WPA", password: 'c,l:a"ve' });
        const png = await QRCode.toBuffer(texto, { width: 360, margin: 2 });
        await page.goto("/herramientas/qr?tipo=wifi");
        await page.getByLabel("Leer el QR de tu red").setInputFiles({ name: "wifi.png", mimeType: "image/png", buffer: png });
        await expect(page.getByLabel("Nombre de la red (SSID)")).toHaveValue("Casa Pérez; 2,4");
        await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue('c,l:a"ve');
        await expect(page.getByRole("status").filter({ hasText: "Red leída" })).toBeVisible();
    });

    test("Wi-Fi: una imagen sin QR de red avisa en vez de borrar lo escrito", async ({ page }) => {
        const png = await QRCode.toBuffer("https://nicoholas.dev", { width: 300 });
        await page.goto("/herramientas/qr?tipo=wifi");
        await page.getByLabel("Nombre de la red (SSID)").fill("Mi red");
        await page.getByLabel("Leer el QR de tu red").setInputFiles({ name: "otro.png", mimeType: "image/png", buffer: png });
        await expect(page.locator("#tools-content").getByRole("alert")).toContainText(/no es de una red Wi-Fi/i);
        await expect(page.getByLabel("Nombre de la red (SSID)")).toHaveValue("Mi red");
    });

    test("contacto: en un celular con selector de contactos, «Elegir de mis contactos» llena la vCard", async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window, "ContactsManager", { value: function ContactsManager() {} });
            Object.defineProperty(navigator, "contacts", { value: { select: async () => [{ name: ["Ana María Pérez"], tel: ["+56 9 1234 5678"], email: ["ana@ejemplo.cl"] }], getProperties: async () => ["name", "tel", "email"] } });
        });
        await page.goto("/herramientas/qr?tipo=vcard");
        await page.getByRole("button", { name: "Elegir de mis contactos" }).click();
        await expect(page.getByLabel("Nombre *")).toHaveValue("Ana María");
        await expect(page.getByLabel("Apellido")).toHaveValue("Pérez");
        await expect(page.getByLabel("Celular")).toHaveValue("+56 9 1234 5678");
        await expect(page.getByLabel("Correo")).toHaveValue("ana@ejemplo.cl");
    });

    test("contacto: sin selector de contactos (PC), el botón no aparece", async ({ page }) => {
        await page.goto("/herramientas/qr?tipo=vcard");
        await page.getByLabel("Nombre *").waitFor();
        await expect(page.getByRole("button", { name: "Elegir de mis contactos" })).toHaveCount(0);
    });
});
