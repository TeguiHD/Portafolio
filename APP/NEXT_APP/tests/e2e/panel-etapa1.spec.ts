import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Panel, etapa 1: armazón nuevo (riel, barra, buscador, celular), escritorio «Hoy» con datos reales y tema claro en el interior.
 * Necesita la base de prueba sembrada (prisma/seed.ts + sembrar-panel.ts) y estas variables:
 * ADMIN_PRUEBA_CORREO, ADMIN_PRUEBA_CLAVE y ADMIN_PRUEBA_TOTP (archivo con el secreto). Sin ellas se salta: nunca contra producción.
 */
const CORREO = process.env.ADMIN_PRUEBA_CORREO, CLAVE = process.env.ADMIN_PRUEBA_CLAVE, TOTP = process.env.ADMIN_PRUEBA_TOTP;
const ESTADO = "test-results/panel-sesion.json";
test.skip(!CORREO || !CLAVE || !TOTP, "necesita el admin de prueba sembrado");
test.describe.configure({ mode: "serial" });

function codigo(secreto: string): string {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, valor = 0; const bytes: number[] = [];
    for (const c of secreto.toUpperCase().replace(/[^A-Z2-7]/g, "")) { valor = (valor << 5) | alfabeto.indexOf(c); bits += 5; if (bits >= 8) { bytes.push((valor >>> (bits - 8)) & 0xff); bits -= 8; } }
    const contador = Buffer.alloc(8); contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const h = createHmac("sha1", Buffer.from(bytes)).update(contador).digest(), o = h[h.length - 1]! & 0xf;
    return (((h[o]! & 0x7f) << 24 | h[o + 1]! << 16 | h[o + 2]! << 8 | h[o + 3]!) % 1e6).toString().padStart(6, "0");
}

async function abrir(browser: Browser, ancho = 1440, tema?: "claro"): Promise<Page> {
    const ctx = await browser.newContext({ storageState: ESTADO, viewport: { width: ancho, height: ancho > 900 ? 900 : 844 } });
    if (tema) await ctx.addInitScript((t) => localStorage.setItem("tema", t), tema);
    return ctx.newPage();
}

/** Superficies oscuras opacas y textos casi blancos dentro del contenido: en tema claro no debería quedar ninguno. */
async function restosOscuros(page: Page) {
    return page.evaluate(() => {
        // Cualquier formato (rgb, oklab, color(srgb …) de color-mix) se pasa a RGBA pintándolo en un canvas de 1×1.
        const lienzo = document.createElement("canvas"); lienzo.width = lienzo.height = 1;
        const cx = lienzo.getContext("2d", { willReadFrequently: true })!;
        const rgb = (c: string) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; return [r!, g!, b!, a! / 255]; };
        const lum = ([r, g, b]: number[]) => (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
        const satur = ([r, g, b]: number[]) => (Math.max(r!, g!, b!) - Math.min(r!, g!, b!)) / 255;
        /** El fondo opaco más cercano (el propio o el de un ancestro). */
        const fondoDe = (el: Element | null): number[] => {
            for (let e = el; e; e = e.parentElement) {
                const st = getComputedStyle(e);
                if (st.backgroundImage.includes("gradient")) return [0, 0, 0, 1]; // degradado de color: el texto blanco encima está bien
                const c = rgb(st.backgroundColor); if (c.length >= 3 && (c[3] ?? 1) >= 0.5) return c;
            }
            return [245, 244, 240];
        };
        const malos: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(".ad-contenido *")) {
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            const s = getComputedStyle(el), bg = rgb(s.backgroundColor), tx = rgb(s.color), nombre = `${el.tagName}.${el.className.toString().slice(0, 90)}`;
            // Superficie gris oscura opaca (un botón de color saturado sí puede ser oscuro).
            if (bg.length >= 3 && (bg[3] ?? 1) >= 0.6 && lum(bg) < 0.2 && satur(bg) < 0.15) malos.push(`fondo ${nombre}`);
            // Texto casi blanco sobre un fondo claro (sobre un botón oscuro o de color está bien).
            const conTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
            if (conTexto && lum(tx) > 0.85 && (tx[3] ?? 1) > 0.5 && lum(fondoDe(el)) > 0.6) malos.push(`texto ${nombre}`);
        }
        return [...new Set(malos)].slice(0, 15);
    });
}

test.beforeAll(async ({ browser }) => {
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

test("el riel agrupa las secciones en castellano, con contadores y la actual marcada", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin");
    const riel = page.getByRole("complementary", { name: "Secciones del panel" });
    for (const g of ["Comercial", "Personal", "Sitio", "Administración"]) await expect(riel.getByRole("group", { name: g })).toBeVisible();
    await expect(riel.getByRole("link", { name: /^Hoy/ })).toHaveAttribute("aria-current", "page");
    await expect(riel.getByRole("link", { name: /^Propuestas/ })).toContainText("2");
    await expect(riel.getByRole("link", { name: /^Mensajes/ })).toContainText("2");
    await expect(riel.getByRole("link", { name: /Laboratorio/ })).toHaveAttribute("target", "_blank");
    await expect(riel).not.toContainText(/Dashboard|Pipeline CRM|VPS Control/);
    await riel.getByRole("link", { name: /^Oportunidades/ }).click();
    await expect(page).toHaveURL(/gestion-comercial\/pipeline/);
    await expect(page.getByRole("navigation", { name: "Estás en" })).toContainText("Oportunidades");
    // El acento del panel es el del sitio, no el naranja de antes.
    expect(await page.locator(".panel").first().evaluate((e) => getComputedStyle(e).getPropertyValue("--color-accent-1").trim())).toBe("#5eead4");
});

test("«Hoy» muestra lo pendiente y cifras reales (sin contar las visitas al panel)", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hoy.");
    await expect(page.locator(".hoy-resumen")).toHaveText("2 propuestas esperan firma, 2 mensajes sin leer y un cobro por vencer.");
    const lista = page.locator(".hoy-lista");
    await expect(lista.getByRole("link", { name: /Propuesta 2026-801 · Empresa Ficticia/ })).toContainText("El código vence el");
    await expect(lista.getByRole("link", { name: /2 mensajes sin leer/ })).toHaveAttribute("href", "/admin/contact");
    await expect(lista.getByRole("link", { name: /Cuota 2 de 3 · Empresa Ficticia/ })).toBeVisible();
    // Lo sembrado: 30 días con 3 + (7d mod 11) visitas públicas cada uno, desde 40 direcciones; la del panel no cuenta.
    let total = 0; const ips = new Set<number>();
    for (let d = 0; d < 30; d++) for (let k = 0; k < 3 + ((d * 7) % 11); k++) { total++; ips.add((d * 13 + k) % 40); }
    const cifras = page.locator(".hoy-cifras");
    // Las otras pruebas también visitan páginas públicas (y cuentan): al menos lo sembrado, y la curva suma lo mismo que la cifra.
    const visitas = Number((await cifras.locator("div", { hasText: /^visitas/ }).locator("dd").innerText()).match(/^[\d.]+/)![0].replace(/\./g, ""));
    expect(visitas).toBeGreaterThanOrEqual(total);
    await expect(page.getByRole("img", { name: new RegExp(`^${visitas} visitas en 30 días`) })).toBeVisible();
    expect(Number(await cifras.locator("div", { hasText: /^visitantes/ }).locator("dd").innerText())).toBeGreaterThanOrEqual(ips.size);
    await expect(cifras).not.toContainText(/CV|WhatsApp/);
});

test("el buscador (Ctrl K) lleva a secciones y encuentra clientes", async ({ browser }) => {
    const page = await abrir(browser);
    await page.goto("/admin");
    await page.keyboard.press("Control+k");
    const dialogo = page.getByRole("dialog", { name: "Buscar en el panel" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.type("pipeline");
    await expect(dialogo.getByRole("option", { name: /Oportunidades/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/gestion-comercial\/pipeline/);
    await expect(page.getByRole("navigation", { name: "Estás en" })).toContainText("Oportunidades");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Ficticia");
    await expect(page.getByRole("option", { name: /Empresa Ficticia/ }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
});

test("en tema claro el interior de las secciones no deja superficies oscuras ni texto blanco", async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await abrir(browser, 1440, "claro");
    for (const ruta of ["/admin", "/admin/cotizaciones", "/admin/contact", "/admin/users", "/admin/finance", "/admin/gestion-comercial/pipeline", "/admin/security"]) {
        await page.goto(ruta);
        // Seguridad sondea «en vivo»: la red nunca queda del todo quieta, así que se espera un rato y se sigue.
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
        expect.soft(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), ruta).toBe("rgb(245, 244, 240)");
        expect.soft(await restosOscuros(page), ruta).toEqual([]);
    }
});

test("en celular: barra inferior con lo más usado y «Más» con todas las secciones", async ({ browser }) => {
    const page = await abrir(browser, 390);
    await page.goto("/admin");
    await expect(page.getByRole("complementary", { name: "Secciones del panel" })).toBeHidden();
    const abajo = page.getByRole("navigation", { name: "Lo más usado" });
    for (const n of ["Hoy", "Propuestas", "Clientes", "Mensajes"]) await expect(abajo.getByRole("link", { name: new RegExp(`^${n}`) })).toBeVisible();
    await expect(abajo.getByRole("button", { name: "Más" })).toBeVisible();
    await abajo.getByRole("button", { name: "Más" }).click();
    const mas = page.getByRole("dialog", { name: "Todas las secciones" });
    await expect(mas.getByRole("link", { name: /Usuarios/ })).toBeVisible();
    await mas.getByRole("link", { name: /Usuarios/ }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(mas).toBeHidden();
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, "sin desplazamiento lateral").toBeLessThanOrEqual(390);
});
