import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY } from "../../src/lib/tool-registry";

test.describe("Herramientas con el lenguaje del sitio", () => {
    test("el catálogo: cabecera sobria, destacadas y las 33 por familia, sin esfera", async ({ page }) => {
        await page.goto("/herramientas");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toHaveText("Herramientas.");
        await expect(page.locator("#he-esfera, .he-nodo")).toHaveCount(0);
        const destacadas = page.getByRole("region", { name: /^(Destacadas|Las más usadas)$/ });
        await expect(destacadas.locator(".ht-destacada")).toHaveCount(6);
        await expect(page.locator(".ht-grupo")).toHaveCount(7); // seis familias + Chile
        await expect(page.locator(".ht-fila")).toHaveCount(33);
        await expect(page.locator(".tool-tile, .tools-catalog-search")).toHaveCount(0);
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "marco");
    });

    test("sin datos de uso: el rótulo es «Destacadas» y va el orden de respaldo", async ({ page, baseURL }) => {
        test.skip(!!baseURL?.includes("nicoholas.dev"), "en producción hay visitas reales: el rótulo puede ser «Las más usadas»");
        await page.goto("/herramientas");
        const destacadas = page.getByRole("region", { name: "Destacadas" });
        await expect(destacadas.locator(".ht-destacada a")).toHaveText([/QR/, /Fondo/i, /Compres/i, /Contraseñas/i, /JSON/, /IVA/]);
        // «Nueva» solo en las publicadas hace menos de 60 días (las chilenas, desde el 22-11-2026).
        const nuevas = DEFAULT_TOOL_REGISTRY.filter((t) => t.publicada && Date.now() - Date.parse(t.publicada) < 60 * 86_400_000).length;
        await expect(page.locator(".ht-nueva")).toHaveCount(nuevas);
    });

    test("al buscar o filtrar, las destacadas se ocultan", async ({ page }) => {
        await page.goto("/herramientas");
        const buscar = page.getByRole("searchbox", { name: "Buscar herramientas" });
        await buscar.fill("json");
        await expect(page.locator(".ht-destacada")).toHaveCount(0);
        await buscar.fill("");
        await expect(page.locator(".ht-destacada")).toHaveCount(6);
        await page.getByRole("button", { name: /^Redes/ }).click();
        await expect(page.locator(".ht-destacada")).toHaveCount(0);
    });

    test("a 390 px las destacadas van de a dos y nada desborda", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/herramientas");
        await expect(page.locator(".ht-destacada")).toHaveCount(6);
        const filas = await page.locator(".ht-destacada").evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(new Set(filas).size).toBe(3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    for (const ancho of [1440, 360]) {
        // La tarjeta reparte su alto (filas auto auto 1fr): si el párrafo se estira, asoma una línea más bajo los «…».
        test(`la descripción de una destacada no muestra más líneas que las del recorte (${ancho} px)`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            await expect(page.locator(".ht-destacada")).toHaveCount(6);
            const sobran = await page.locator(".ht-destacada p").evaluateAll((ps) => ps.flatMap((p) => {
                const cs = getComputedStyle(p), lineas = Number(cs.webkitLineClamp), alto = Number.parseFloat(cs.lineHeight) * lineas;
                return p.clientHeight > alto + 1 ? [`${p.textContent?.slice(0, 20)}: ${p.clientHeight} > ${alto}`] : [];
            }));
            expect(sobran).toEqual([]);
        });
    }

    for (const ancho of [1440, 390]) {
        test(`las destacadas van alineadas con el buscador, con su rótulo encima y sin hueco tras el título (${ancho} px)`, async ({ page }) => {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            const m = await page.evaluate(() => {
                const caja = (s: string) => document.querySelector(s)!.getBoundingClientRect();
                return { buscar: caja(".ht-buscar").left, tarjeta: caja(".ht-destacada").left, rotulo: caja(".ht-destacadas h2").bottom,
                    arriba: caja(".ht-destacada").top, linea: caja(".ht-cab p").bottom, buscador: caja(".ht-buscar").top };
            });
            expect(Math.abs(m.tarjeta - m.buscar)).toBeLessThanOrEqual(2);
            expect(m.rotulo).toBeLessThanOrEqual(m.arriba);
            expect(m.buscador - m.linea).toBeLessThanOrEqual(90);
        });
    }

    test("sin JavaScript, el buscador y las familias se ven: nada de arriba espera a hidratar", async ({ browser }) => {
        const ctx = await browser.newContext({ javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto("/herramientas");
        for (const sel of ["#catalogo .ancho", ".ht-filtros", ".ht-familias"]) {
            expect(await page.locator(sel).first().evaluate((e) => getComputedStyle(e).opacity), sel).toBe("1");
        }
        await ctx.close();
    });

    test("abrir cualquier herramienta registra una visita, una vez por sesión", async ({ page, baseURL }) => {
        test.skip(!!baseURL?.includes("nicoholas.dev"), "en producción dejaría una visita falsa en el ranking");
        // Como una persona: sin la marca de navegador automatizado.
        await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
        const visitas: string[] = [];
        page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/tools/public/dns")) visitas.push(r.postData() ?? ""); });
        await page.goto("/herramientas/dns");
        await expect.poll(() => visitas.length).toBe(1);
        expect(JSON.parse(visitas[0]).action).toBe("view");
        await page.reload();
        await page.waitForTimeout(1500);
        expect(visitas).toHaveLength(1);
    });

    test("un navegador automatizado (navigator.webdriver) no registra visitas: no cuenta en «Las más usadas»", async ({ page }) => {
        const visitas: string[] = [];
        page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/tools/public/")) visitas.push(r.url()); });
        for (const slug of ["dns", "qr"]) { await page.goto(`/herramientas/${slug}`); await page.waitForTimeout(2500); }
        expect(visitas).toEqual([]);
    });

    test("cada herramienta sugiere 3 relacionadas por flujo de trabajo", async ({ page }) => {
        await page.goto("/herramientas/quitar-fondo");
        const nav = page.getByRole("navigation", { name: "También te puede servir" });
        await expect(nav.getByRole("link")).toHaveCount(3);
        await expect(nav.getByRole("link").nth(0)).toHaveAttribute("href", "/herramientas/recortar-imagen");
        await expect(nav.getByRole("link").nth(1)).toHaveAttribute("href", "/herramientas/comprimir-imagen");
        await expect(nav.getByRole("link").nth(2)).toHaveAttribute("href", "/herramientas/marca-agua");
        // Un solo bloque: el antiguo «Herramientas relacionadas» de la guía repetía la idea con palabras clave.
        await expect(page.getByRole("heading", { name: "Herramientas relacionadas" })).toHaveCount(0);
        // En el catálogo no aparece: es solo para quien ya está usando una.
        await page.goto("/herramientas");
        await expect(page.getByRole("navigation", { name: "También te puede servir" })).toHaveCount(0);
    });

    test("en una herramienta la materia se queda en el marco, y la ruta lleva al catálogo", async ({ page }) => {
        await page.goto("/herramientas/json");
        await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", "marco");
        const ruta = page.getByRole("navigation", { name: "Ruta de navegación" });
        await expect(ruta.getByRole("link", { name: "Herramientas" })).toHaveAttribute("href", "/herramientas");
        // Buscar y guardar quedan a la derecha de las migas.
        await expect(page.getByRole("button", { name: "Abrir navegación de herramientas" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Guardar herramienta" })).toBeVisible();
        // La barra del sitio y su pie, como en el resto de las páginas.
        await expect(page.locator("header#nb")).toHaveCount(1);
        await expect(page.locator("footer.suelo")).toHaveCount(1);
    });

    test("en tema claro el interior de las herramientas no deja cajas oscuras (fuera del código y los lienzos)", async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.setItem("tema", "claro"); } catch { /* sin almacenamiento */ } });
        for (const slug of ["json", "claves", "comprimir-imagen", "dns", "impuestos", "subredes", "unidades", "qr", "metadatos"]) {
            await page.goto(`/herramientas/${slug}`);
            await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
            await page.waitForTimeout(400);
            const oscuras = await page.evaluate(() => {
                const lum = (c: string) => { const m = c.match(/[\d.]+/g); if (!m || (m.length > 3 && Number(m[3]) < 0.5)) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
                return [...document.querySelectorAll<HTMLElement>("#tools-content *")]
                    .filter((e) => !e.closest("pre, code, canvas, svg, img, video, [data-terminal]"))
                    .filter((e) => { const r = e.getBoundingClientRect(); return r.width * r.height > 30000 && lum(getComputedStyle(e).backgroundColor) < 0.2; })
                    .map((e) => `${e.tagName}.${String(e.className).slice(0, 60)}`);
            });
            expect(oscuras, `${slug}: cajas oscuras en tema claro`).toEqual([]);
        }
    });
});

