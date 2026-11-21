import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Panel: «Mi perfil» como la página de cuenta de un producto serio. Una sola página (sin pestañas), solo lo de la cuenta
 * (sin cifras del negocio ni accesos que repiten el menú), estados reales (sin insignias fijas ni citas de normas) y la
 * 2FA obligatoria presentada como «cambiar de app». Necesita el admin de prueba (ver panel-etapa1.spec.ts); nunca en producción.
 */
const CORREO = process.env.ADMIN_PRUEBA_CORREO, CLAVE = process.env.ADMIN_PRUEBA_CLAVE, TOTP = process.env.ADMIN_PRUEBA_TOTP;
test.skip(!CORREO || !CLAVE || !TOTP, "necesita el admin de prueba sembrado");
test.describe.configure({ mode: "serial" });

// La misma sesión que las demás pruebas del panel (panel-etapa1 la crea): un ingreso nuevo desde el mismo navegador
// reemplaza al anterior, así que dos sesiones propias se botarían entre sí. Si no está o ya no sirve, se entra aquí.
const ESTADO = "test-results/panel-sesion.json";

function codigo(secreto: string): string {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, valor = 0; const bytes: number[] = [];
    for (const c of secreto.toUpperCase().replace(/[^A-Z2-7]/g, "")) { valor = (valor << 5) | alfabeto.indexOf(c); bits += 5; if (bits >= 8) { bytes.push((valor >>> (bits - 8)) & 0xff); bits -= 8; } }
    const contador = Buffer.alloc(8); contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const h = createHmac("sha1", Buffer.from(bytes)).update(contador).digest(), o = h[h.length - 1]! & 0xf;
    return (((h[o]! & 0x7f) << 24 | h[o + 1]! << 16 | h[o + 2]! << 8 | h[o + 3]!) % 1e6).toString().padStart(6, "0");
}

test.beforeAll(async ({ browser }) => {
    if (existsSync(ESTADO)) {
        const prueba = await browser.newContext({ storageState: ESTADO }); const p = await prueba.newPage();
        await p.goto("/admin/profile");
        const viva = new URL(p.url()).pathname === "/admin/profile";
        await prueba.close();
        if (viva) return;
    }
    mkdirSync("test-results", { recursive: true });
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    await page.goto("/acceso");
    await page.getByLabel("Correo").fill(CORREO!);
    await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByLabel("Código de tu app autenticadora").fill(codigo(readFileSync(TOTP!, "utf8").trim()));
    await page.getByRole("button", { name: "Verificar y entrar" }).click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await ctx.storageState({ path: ESTADO });
    await ctx.close();
});

async function perfil(browser: Browser, ancho = 1440): Promise<Page> {
    const ctx = await browser.newContext({ storageState: ESTADO, viewport: { width: ancho, height: ancho > 900 ? 900 : 844 } });
    const page = await ctx.newPage();
    await page.goto("/admin/profile");
    await page.getByRole("heading", { level: 1 }).waitFor();
    return page;
}

test("una sola página con las secciones de la cuenta, sin pestañas", async ({ browser }) => {
    const page = await perfil(browser);
    await expect(page.getByRole("tab")).toHaveCount(0);
    for (const titulo of ["Contraseña", "Verificación en dos pasos", "Sesiones activas", "Actividad reciente", "Tus datos"]) {
        // Algunos títulos llevan su número al lado («Sesiones activas 1»).
        await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${titulo}( \\d+)?$`) }), titulo).toBeVisible();
    }
    // El índice lleva a cada sección.
    await page.getByRole("navigation", { name: "Secciones del perfil" }).getByRole("link", { name: "Actividad" }).click();
    await expect(page).toHaveURL(/#actividad$/);
});

test("solo lo de la cuenta: sin cifras del negocio ni accesos que repiten el menú", async ({ browser }) => {
    const page = await perfil(browser);
    const texto = await page.locator("main").innerText();
    for (const ajeno of ["Accesos directos", "Conexiones", "Propuestas\n", "Contratos\n"]) expect(texto, ajeno).not.toContain(ajeno);
});

test("estados reales, sin insignias fijas ni citas de normas", async ({ browser }) => {
    const page = await perfil(browser);
    const texto = await page.locator("main").innerText();
    for (const relleno of ["NIST", "OWASP", "RGPD", "Registrando", "Estado de seguridad", "Sesiones vigiladas"]) expect(texto, relleno).not.toContain(relleno);
    // Lo que sí es cierto, dicho una vez y en simple (auth.ts: 7 días; 5 intentos cada 15 minutos; aviso en Notificaciones).
    await expect(page.locator("main")).toContainText("7 días");
    await expect(page.locator("main")).toContainText("5 intentos");
});

test("la actividad se lee en palabras: sin JSON crudo", async ({ browser }) => {
    const page = await perfil(browser);
    const actividad = await page.locator("#actividad").innerText();
    expect(actividad).not.toMatch(/[{}"]/);
});

test("la 2FA obligatoria se presenta como cambiar de app, no como desactivarla", async ({ browser }) => {
    const page = await perfil(browser);
    await expect(page.getByRole("button", { name: "Cambiar de app autenticadora" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Desactivar/ })).toHaveCount(0);
});

test("celular: sin desborde y la cuenta empieza arriba (sin una pantalla de cifras antes)", async ({ browser }) => {
    const page = await perfil(browser, 390);
    const fuera = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("main *")].filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || r.right <= innerWidth + 0.5) return false;
        for (let a = e.parentElement; a; a = a.parentElement) if (getComputedStyle(a).overflowX !== "visible" && a.tagName !== "HTML" && a.tagName !== "BODY") return false;
        return true;
    }).map((e) => e.tagName));
    expect(fuera).toEqual([]);
    const contrasena = page.getByRole("heading", { level: 2, name: /^Contraseña/ });
    await expect(contrasena).toBeVisible();
    const y = (await contrasena.boundingBox())!.y;
    // El índice cabe entero (antes «Tus datos» quedaba cortado).
    const indice = page.getByRole("navigation", { name: "Secciones del perfil" });
    for (const enlace of await indice.getByRole("link").all()) { const r = (await enlace.boundingBox())!; expect(r.x + r.width, await enlace.innerText()).toBeLessThanOrEqual(390); }
    expect(y).toBeLessThan(844 * 1.2);
});
