import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { tasaConPesos } from "../../src/lib/finanzas/tasa-pesos";

/**
 * Panel, tanda 5 (24-11-2026): convertidor con pesos chilenos, avisos sin bucle, Mi perfil sin error de hidratación,
 * sin «·» entre datos, fichas a filas y Finanzas vacía sin asistente. Las pruebas con navegador reutilizan la sesión
 * que deja panel-etapa1.spec.ts (correr ese archivo antes, en la misma pasada). Sin esa sesión se saltan: nunca contra producción.
 */
const ESTADO = "test-results/panel-sesion.json";

async function abrir(browser: Browser, ancho = 1440): Promise<Page> {
    const ctx = await browser.newContext({ storageState: ESTADO, viewport: { width: ancho, height: ancho > 900 ? 900 : 844 } });
    return ctx.newPage();
}

/** Bloques con borde en los cuatro lados, esquinas redondeadas y fondo propio, fuera de tablas, gráficos, diálogos y formularios. */
const FICHAS = () => {
    const fuera = "table, figure, dialog, [role=dialog], [popover], form, canvas, svg";
    return [...document.querySelectorAll<HTMLElement>("main div, main section, main article, main li")].filter((e) => {
        if (e.closest(fuera)) return false;
        const r = e.getBoundingClientRect();
        if (r.width < 200 || r.height < 80) return false;
        const c = getComputedStyle(e);
        const borde = ["Top", "Right", "Bottom", "Left"].every((l) => parseFloat(c.getPropertyValue(`border-${l.toLowerCase()}-width`)) > 0 && c.getPropertyValue(`border-${l.toLowerCase()}-style`) !== "none");
        const fondo = c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent";
        return borde && fondo && parseFloat(c.borderTopLeftRadius) > 0;
    }).map((e) => `${e.tagName.toLowerCase()}.${e.className.toString().slice(0, 60)}`);
};

test.describe("sin navegador", () => {
    const ind = { dolar: 950, euro: 1030 };

    test("convertidor: los pares con pesos chilenos usan el dólar y el euro del día", async () => {
        expect(await tasaConPesos("CLP", "USD", ind)).toBeCloseTo(1 / 950, 10);
        expect(await tasaConPesos("USD", "CLP", ind)).toBe(950);
        expect(await tasaConPesos("EUR", "CLP", ind)).toBe(1030);
        expect(await tasaConPesos("CLP", "EUR", ind)).toBeCloseTo(1 / 1030, 10);
    });

    test("convertidor: un par sin pesos chilenos no es asunto suyo (sigue con Frankfurter)", async () => {
        expect(await tasaConPesos("USD", "EUR", ind)).toBeNull();
    });

    test("convertidor: otra moneda con pesos pasa por el dólar; sin euro del día, el euro también", async () => {
        const usdA = async (m: string) => ({ GBP: 0.8, EUR: 0.92 })[m]!;
        expect(await tasaConPesos("CLP", "GBP", ind, usdA)).toBeCloseTo(0.8 / 950, 10);
        expect(await tasaConPesos("GBP", "CLP", ind, usdA)).toBeCloseTo(950 / 0.8, 6);
        expect(await tasaConPesos("CLP", "EUR", { dolar: 950 }, usdA)).toBeCloseTo(0.92 / 950, 10);
    });

    test("ningún «·» entre datos en el código del panel", () => {
        const carpetas = ["src/app/admin", "src/modules/admin", "src/components/admin", "src/modules/finance", "src/modules/quotations", "src/components/quotations"].filter(existsSync);
        const archivos = carpetas.flatMap((c) => (readdirSync(c, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f)).map((f) => `${c}/${f}`));
        expect(archivos.length).toBeGreaterThan(50);
        const con: string[] = [];
        for (const a of archivos) {
            const codigo = readFileSync(a, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
            const n = (codigo.match(/·/g) ?? []).length;
            if (n) con.push(`${a} (${n})`);
        }
        expect(con).toEqual([]);
    });
});

test.describe("con la sesión de prueba", () => {
    test.beforeEach(() => test.skip(!existsSync(ESTADO), "necesita la sesión de panel-etapa1.spec.ts"));

    test("convertidor: de pesos a dólares da una tasa, sin error", async ({ browser }) => {
        const page = await abrir(browser);
        await page.goto("/admin/finance/settings");
        await expect(page.getByText(/1 CLP = /)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("Error en la conversión")).toHaveCount(0);
    });

    test("mensajes: con la API caída, un aviso y sin pedidos en bucle", async ({ browser }) => {
        const page = await abrir(browser);
        let pedidos = 0;
        await page.route("**/api/admin/contact?**", (r) => { pedidos++; return r.fulfill({ status: 500, contentType: "application/json", body: "{}" }); });
        await page.goto("/admin/contact");
        await page.waitForTimeout(3000);
        expect(pedidos, "pedidos a la lista").toBeLessThanOrEqual(2);
        expect(await page.getByText("No se pudieron cargar los mensajes").count(), "avisos").toBeLessThanOrEqual(1);
    });

    test("mi perfil: sin error de hidratación", async ({ browser }) => {
        const page = await abrir(browser);
        const errores: string[] = [];
        page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
        page.on("pageerror", (e) => errores.push(e.message));
        await page.goto("/admin/profile");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForTimeout(1500);
        expect(errores.filter((e) => /#418|#423|[Hh]ydrat/.test(e))).toEqual([]);
    });

    test("usuarios: el subtítulo dice cuántas cuentas hay", async ({ browser }) => {
        const page = await abrir(browser);
        await page.goto("/admin/users");
        await expect(page.getByText(/^Cuentas, roles y permisos: \d+ usuarios?$/)).toBeVisible();
    });

    for (const ruta of ["/admin/clientes", "/admin/cotizaciones", "/admin/finance/settings", "/admin/finance/ai", "/admin/profile"]) {
        test(`${ruta}: sin fichas con borde y fondo fuera de tablas y gráficos`, async ({ browser }) => {
            const page = await abrir(browser);
            await page.goto(ruta);
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
            await page.waitForTimeout(1200);
            expect(await page.evaluate(FICHAS)).toEqual([]);
        });
    }

    for (const ruta of ["/admin/clientes", "/admin/cotizaciones"]) {
        test(`${ruta}: en celular, sin desplazamiento lateral`, async ({ browser }) => {
            const page = await abrir(browser, 390);
            await page.goto(ruta);
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
            await page.waitForTimeout(800);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        });
    }

    test("seguridad: las severidades sin íconos", async ({ browser }) => {
        const page = await abrir(browser);
        await page.goto("/admin/security");
        const seccion = page.locator("section", { has: page.locator("#severidad-t") });
        await expect(seccion.getByRole("button").first()).toBeVisible();
        expect(await seccion.getByRole("button").locator("svg").count()).toBe(0);
    });

    test("finanzas sin cuentas: un estado vacío que invita a crear la primera, sin asistente de bienvenida", async ({ browser }) => {
        const page = await abrir(browser);
        await page.goto("/admin/finance");
        await expect(page.getByRole("link", { name: "Crea tu primera cuenta" })).toHaveAttribute("href", "/admin/finance/accounts?nueva=1");
        await expect(page.getByText(/Bienvenid/)).toHaveCount(0);
    });
});
