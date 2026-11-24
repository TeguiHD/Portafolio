import { expect, test } from "@playwright/test";
import { getDefaultPublicToolCatalog } from "../../src/lib/tool-registry";
import { TOOL_COUNT } from "../../src/lib/tool-count";

/** Herramientas más profesionales: una sola cabecera verificada, sin relleno, colores del sitio y resultado de entrada. */
const CATALOGO = new Map(getDefaultPublicToolCatalog().map((t) => [t.slug, t]));
const NAVEGADOR = "Funciona en tu navegador: lo que escribes o subes no sale de tu equipo.";
const DONDE: Record<string, string> = {
    dns: "La consulta la hace nuestro servidor, contra seis resolvedores públicos.",
    regex: "Funciona en tu navegador. Solo las funciones con IA envían a nuestro servidor la descripción o el patrón, nunca el texto de prueba, y este los pasa a Mistral por OpenRouter.",
    qr: "Funciona en tu navegador. Solo la vista 3D de realidad aumentada pasa la dirección del modelo al visor del sitio, que lo carga desde ahí.",
};

test.describe("Herramientas profesionales", () => {
    for (const slug of ["qr", "quitar-fondo", "claves", "json", "impuestos", "dns", "regex", "ascii", "comprimir-imagen"]) {
        test(`${slug}: la cabecera dice lo mismo que el catálogo y dónde se procesa`, async ({ page }) => {
            const t = CATALOGO.get(slug)!;
            await page.goto(`/herramientas/${slug}`);
            await expect(page.locator("h1")).toHaveCount(1);
            await expect(page.locator("h1")).toHaveText(t.name);
            const cab = page.locator("header.th");
            await expect(cab.locator("p").first()).toHaveText(t.description);
            await expect(cab.locator(".th-donde")).toHaveText(DONDE[slug] ?? NAVEGADOR);
            const migas = page.getByRole("navigation", { name: "Ruta de navegación" });
            await expect(migas.locator("li").last()).toContainText(t.name);
        });
    }

    test("sin frases de relleno ni emojis decorativos", async ({ page }) => {
        const vetadas: Record<string, string[]> = {
            "quitar-fondo": ["cambia todo", "perfecto"],
            claves: ["profesionales", "benchmarks", "Benchmarks"],
            regex: ["✨", "🤖"],
        };
        for (const [slug, frases] of Object.entries(vetadas)) {
            await page.goto(`/herramientas/${slug}`);
            const texto = await page.locator("#tools-content").innerText();
            for (const f of frases) expect(texto, `${slug}: «${f}»`).not.toContain(f);
        }
    });

    test("quitar fondo dice que la descarga no lleva marca de agua (diferencia real frente a la competencia)", async ({ page }) => {
        await page.goto("/herramientas/quitar-fondo");
        await expect(page.locator("#tools-content")).toContainText(/sin marca de agua/i);
    });

    test("contraseñas e IVA usan los colores del sitio, sin verde neón ni degradados", async ({ page }) => {
        const neon = (c: string) => { const [r, g, b] = (c.match(/[\d.]+/g) ?? []).map(Number); return g - Math.max(r, b) > 60; };
        // Tailwind 4 da los colores en oklch(): se pasan a RGB pintándolos en un canvas de 1 px (si no, «neón» no veía nada).
        const rgb = (e: Element, prop: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = getComputedStyle(e)[prop as "color"]; c.fillRect(0, 0, 1, 1); const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`; };
        await page.goto("/herramientas/claves");
        const generar = page.getByRole("button", { name: "Generar otra", exact: true });
        expect(await generar.evaluate((e) => getComputedStyle(e).backgroundImage)).toBe("none");
        expect(neon(await generar.evaluate(rgb, "backgroundColor"))).toBe(false);
        await page.goto("/herramientas/impuestos");
        const activa = page.getByRole("button", { name: /Agregar IVA/ }).first();
        expect(neon(await activa.evaluate(rgb, "backgroundColor"))).toBe(false);
        expect(neon(await activa.evaluate(rgb, "color"))).toBe(false);
    });

    test("IVA abre con un monto de ejemplo ya calculado, y al escribir se reemplaza", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        await expect(page.locator("#tools-content")).toContainText("11.900");
        const monto = page.getByLabel(/Monto/).first();
        await monto.fill("5000");
        await expect(page.locator("#tools-content")).toContainText("5.950");
    });

    test("JSON se puede probar con un ejemplo", async ({ page }) => {
        await page.goto("/herramientas/json");
        await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
        await expect(page.locator("#tools-content")).toContainText(`"herramientas": ${TOOL_COUNT}`);
    });

    test("unidades: lo que escribes no viaja al servidor dentro de la URL de la visita", async ({ page }) => {
        const cuerpos: string[] = [];
        page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/analytics")) cuerpos.push(r.postData() ?? ""); });
        await page.goto("/herramientas/unidades");
        const valor = page.locator("#unidades-valor");
        await valor.fill("1534");
        await page.waitForTimeout(3000);
        expect(cuerpos.length).toBeGreaterThan(0);
        for (const c of cuerpos) expect(c).not.toContain("1534");
    });

    test("IVA: escribir sobre el ejemplo lo reemplaza, aunque se haga clic al final", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        const monto = page.getByLabel(/Monto/).first();
        await monto.click({ position: { x: 200, y: 20 } });
        await monto.pressSequentially("5000");
        await expect(page.locator("#tools-content")).toContainText("5.950");
        await expect(monto).toHaveValue("5.000"); // con el separador de miles al escribir (23-11-2026)
    });

    test("contraseñas en tema claro: el botón y la opción activa se leen (contraste ≥ 4,5)", async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.setItem("tema", "claro"); } catch { /* sin almacenamiento */ } });
        await page.goto("/herramientas/claves");
        await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
        const contraste = (a: string, b: string) => {
            const lum = (c: string) => { const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => { const x = Number(v) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
            const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05);
        };
        const boton = page.getByRole("button", { name: "Generar otra", exact: true });
        const [tinta, fondo] = await boton.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]);
        expect(contraste(tinta, fondo), `botón ${tinta} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
        const superficie = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        const activa = page.getByRole("button", { name: "Caracteres al azar" });
        const color = await activa.evaluate((e) => getComputedStyle(e).color);
        expect(contraste(color, superficie), `opción activa ${color}`).toBeGreaterThanOrEqual(4.5);
    });
});
