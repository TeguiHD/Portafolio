import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY } from "../../src/lib/tool-registry";
import { DESTACADAS_RESPALDO } from "../../src/lib/tool-destacadas";
import { MENU_HERRAMIENTAS } from "../../src/lib/tool-menu";

/** Ronda 2: ninguna herramienta parece de otro sitio. Mismo marco, dos anchos y la cabecera centrada. */
const SITIO = 1180;
const ESTRECHA = 896;

/** Elementos de la herramienta que se salen de la ventana. Se mira cada uno porque html, body y .viva recortan el desborde
 * (overflow clip): scrollWidth del documento nunca lo ve. Lo que está dentro de algo que desliza o recorta a propósito no cuenta. */
const FUERA_DE_LA_VENTANA = () => {
    const ancho = document.documentElement.clientWidth;
    const raiz = document.querySelector("#tools-content")!;
    const fuera: string[] = [];
    for (const e of raiz.querySelectorAll<HTMLElement>("*")) {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || (r.right <= ancho + 0.5 && r.left >= -0.5)) continue;
        let contenido = false;
        for (let a = e.parentElement; a && a !== raiz; a = a.parentElement) if (getComputedStyle(a).overflowX !== "visible") { contenido = true; break; }
        const cs = getComputedStyle(e);
        if (contenido || cs.position === "fixed" || cs.clipPath !== "none" || cs.clip !== "auto" || Number(cs.opacity) === 0) continue;
        fuera.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join(".")} ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
    return fuera;
};

async function medir(page: Page) {
    // Algunas herramientas montan su <main> al hidratar (medir antes daba −1), y mientras Next transmite la página hay
    // una copia oculta del contenido: se espera el título visible (por rol, que ignora lo oculto).
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.locator("#tools-content main").first().waitFor();
    return page.evaluate(() => {
        const w = (s: string) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : -1; };
        const h1 = document.querySelector("h1")!;
        const r = document.createRange(); r.selectNodeContents(h1);
        const texto = r.getBoundingClientRect();
        const icono = document.querySelector("header.th .th-icono")?.getBoundingClientRect() ?? texto;
        return {
            herramienta: w("#tools-content main"),
            guia: w("details.tool-guide"),
            estudio: w("section.tool-estudio"),
            relacionadas: w("nav.hc-relacionadas"),
            migasX: Math.round(document.querySelector('nav[aria-label="Ruta de navegación"] ol')!.getBoundingClientRect().x),
            centroTitulo: (Math.min(icono.left, texto.left) + Math.max(icono.right, texto.right)) / 2,
            centroVentana: document.documentElement.clientWidth / 2,
            yTitulo: Math.round(texto.top + scrollY),
        };
    });
}

test.describe("Herramientas, ronda 2", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("dos anchos y una sola columna por página: la guía, «Cómo se hizo» y las relacionadas miden lo mismo que la herramienta", async ({ page }) => {
        const migas = new Set<number>();
        for (const [slug, ancho] of [["claves", ESTRECHA], ["impuestos", ESTRECHA], ["qr", SITIO], ["json", SITIO], ["comprimir-imagen", SITIO]] as const) {
            await page.goto(`/herramientas/${slug}`);
            const m = await medir(page);
            expect(m.herramienta, `${slug}: herramienta`).toBe(ancho);
            expect(m.guia, `${slug}: guía`).toBe(ancho);
            expect(m.estudio, `${slug}: «Cómo se hizo»`).toBe(ancho);
            expect(m.relacionadas, `${slug}: relacionadas`).toBe(ancho);
            migas.add(m.migasX);
        }
        expect([...migas], "las migas empiezan en el mismo lugar en todas").toEqual([(1440 - SITIO) / 2]);
    });

    test("el título queda centrado y a la misma altura, sea cual sea el ancho de la herramienta", async ({ page }) => {
        const alturas = new Set<number>();
        for (const slug of ["claves", "qr", "json", "dns"]) {
            await page.goto(`/herramientas/${slug}`);
            const m = await medir(page);
            expect(Math.abs(m.centroTitulo - m.centroVentana), `${slug}: centro del título`).toBeLessThanOrEqual(2);
            alturas.add(m.yTitulo);
        }
        expect(alturas.size).toBe(1);
    });

    test("catálogo: las migas siguen alineadas con su título (la regla de las herramientas no lo toca)", async ({ page }) => {
        await page.goto("/herramientas");
        const migas = (await page.getByRole("navigation", { name: "Ruta de navegación" }).locator("ol").boundingBox())!;
        const titulo = (await page.locator("#ht-cab-titulo").boundingBox())!;
        expect(Math.abs(migas.x - titulo.x)).toBeLessThanOrEqual(1);
    });

    test("datos: el menú de la barra lleva las destacadas y dos de Chile, cada una con una frase corta", () => {
        // El menú vive aparte para no mandar el registro entero al navegador en cada página (24-11-2026). La primera frase
        // de la descripción no cabía en el panel y quedaba cortada a media palabra: cada una lleva la suya, de una línea.
        expect(MENU_HERRAMIENTAS.map((t) => t.slug)).toEqual([...DESTACADAS_RESPALDO, "sueldo-liquido", "uf-utm"]);
        for (const t of MENU_HERRAMIENTAS) {
            expect(t.nombre, t.slug).toBe(DEFAULT_TOOL_REGISTRY.find((x) => x.slug === t.slug)!.name);
            expect(t.que.length, t.slug).toBeGreaterThanOrEqual(12);
            expect(t.que.length, `${t.slug}: «${t.que}»`).toBeLessThanOrEqual(44);
            expect(t.que, t.slug).not.toMatch(/\.$/);
        }
    });

    test("catálogo: el registro completo no viaja al navegador", async ({ page }) => {
        const scripts: Promise<string>[] = [];
        page.on("response", (r) => { if (r.request().resourceType() === "script") scripts.push(r.text().catch(() => "")); });
        // «load»: los scripts de la hidratación ya llegaron (en producción la red nunca queda en reposo: analítica, materia).
        await page.goto("/herramientas", { waitUntil: "load" });
        const todo = (await Promise.all(scripts)).join("\n");
        expect(todo.length).toBeGreaterThan(0);
        expect(todo).not.toContain("contra seis resolvedores públicos");
    });

    test("la guía nombra la herramienta con sus siglas", async ({ page }) => {
        await page.goto("/herramientas/qr");
        await page.locator("details.tool-guide summary").click();
        await expect(page.locator("details.tool-guide h2").first()).toHaveText("Generador de códigos QR, paso a paso");
    });

    test("IVA: la nota de EE. UU. queda asociada a su botón", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        const us = page.getByRole("button", { name: /EE\. UU\./ });
        await us.click();
        await expect(us).toHaveAccessibleDescription(/impuesto a las ventas/);
    });

    test("IVA: la tasa de EE. UU. cabe en una línea, como las demás", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        const alto = async (nombre: RegExp) => (await page.getByRole("button", { name: nombre }).first().boundingBox())!.height;
        expect(await alto(/EE\. UU\./)).toBe(await alto(/^Chile/));
    });
});

test.describe("Herramientas, ronda 2 en el celular", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("el detector de desborde sí ve un elemento que se sale (aunque la página lo recorte)", async ({ page }) => {
        await page.goto("/herramientas/claves");
        await page.getByRole("heading", { level: 1 }).waitFor();
        await page.evaluate(() => { const d = document.createElement("div"); d.style.cssText = "width:600px;height:4px"; document.querySelector("#tools-content main")!.append(d); });
        expect((await page.evaluate(FUERA_DE_LA_VENTANA)).length).toBeGreaterThan(0);
    });

    test("las 29: sin desborde horizontal ni «Volver a herramientas» al pie", async ({ page }) => {
        test.setTimeout(240_000);
        for (const { slug } of DEFAULT_TOOL_REGISTRY) {
            await page.goto(`/herramientas/${slug}`);
            await expect(page.locator("h1")).toHaveCount(1);
            await page.getByRole("heading", { level: 1 }).waitFor();
            expect(await page.evaluate(FUERA_DE_LA_VENTANA), `${slug}: se sale de la ventana`).toEqual([]);
            await expect(page.locator("#tools-content"), slug).not.toContainText("Volver a herramientas");
        }
    });
});
