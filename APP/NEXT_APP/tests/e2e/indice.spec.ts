import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CATEGORIAS, medidos, notaIndice, type Edicion, type IdCategoria } from "../../src/lib/indice/calculos";

// La edición se lee del archivo (Playwright no importa JSON sin atributo de importación).
const EDICION = JSON.parse(readFileSync(new URL("../../src/data/indice/2026-11.json", import.meta.url), "utf8")) as Edicion;
const sitiosDe = (c: IdCategoria) => EDICION.sitios.filter((s) => s.categoria === c);

/**
 * Índice de la Web Chilena (jugada 4 del informe GEO): el informe, los rankings, una ficha por institución, los datos
 * abiertos y el revisor público. Todo sale de src/data/indice/<edición>.json; ninguna cifra se escribe a mano.
 */
const RUTA = "/indice-web-chilena";
const ld = (html: string) => [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1]!)].flat());
/** Cada llamada al revisor con su propia IP de documentación: el límite es de 6 cada 10 minutos por IP. */
let ip = 10;
const otraIp = () => ({ "cf-connecting-ip": `203.0.113.${ip++}` });

test("la edición tiene sitios de los cuatro grupos y casi todos medidos", () => {
    for (const c of CATEGORIAS) expect(sitiosDe(c.id).length, c.id).toBeGreaterThan(0);
    expect(medidos(EDICION.sitios).length / EDICION.sitios.length).toBeGreaterThan(0.85);
    expect(new Set(EDICION.sitios.map((s) => s.slug)).size).toBe(EDICION.sitios.length);
});

test("la portada responde en el HTML: cuántos sitios, qué se midió y los datos como Dataset", async ({ browser, request }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(RUTA);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Índice de la Web Chilena");
    await expect(page.locator(".ix-respuesta")).toContainText(`${EDICION.sitios.length} sitios`);
    await ctx.close();
    const html = await (await request.get(RUTA)).text();
    const datos = ld(html).find((b) => b["@type"] === "Dataset");
    expect(datos.license).toContain("creativecommons.org/licenses/by/4.0");
    expect(datos.distribution.map((d: { encodingFormat: string }) => d.encodingFormat)).toEqual(["text/csv", "application/json"]);
    expect(datos.creator["@id"]).toMatch(/\/#person$/);
});

for (const c of CATEGORIAS) {
    test(`${c.ruta}: el ranking lista a todas, de mayor a menor nota`, async ({ page }) => {
        await page.goto(`${RUTA}/${c.ruta}`);
        const filas = page.locator(".ix-tabla tbody tr");
        await expect(filas).toHaveCount(sitiosDe(c.id).length);
        const notas = await page.locator(".ix-tabla tbody tr:not(.ix-sin) .ix-nota-celda").allInnerTexts();
        const n = notas.map(Number);
        expect(n).toEqual([...n].sort((a, b) => b - a));
    });
}

test("la ficha de una institución: sus cuatro notas, sus controles y la fecha de la medición", async ({ page }) => {
    const s = medidos(EDICION.sitios).find((x) => x.revision)!;
    const c = CATEGORIAS.find((x) => x.id === s.categoria)!;
    await page.goto(`${RUTA}/${c.ruta}/${s.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(s.nombre);
    await expect(page.locator(".ix-respuesta")).toContainText(`nota ${notaIndice(s.notas)} de 100`);
    await expect(page.locator(`progress[aria-label^="Rendimiento"]`)).toHaveAttribute("value", String(s.notas.rendimiento));
    await expect(page.locator(`progress[aria-label^="Accesibilidad"]`)).toHaveAttribute("value", String(s.notas.accesibilidad));
    await expect(page.locator(".ix-controles li")).toHaveCount(12);
    await expect(page.locator("main")).toContainText(/Medido el \d{2}-\d{2}-\d{4} con Lighthouse/);
});

test("los datos se descargan: un CSV con una fila por sitio, sin celdas que Excel abra como fórmula", async ({ request }) => {
    const r = await request.get(`${RUTA}/datos/${EDICION.edicion}.csv`);
    expect(r.headers()["content-type"]).toContain("text/csv");
    const lineas = (await r.text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(lineas).toHaveLength(EDICION.sitios.length + 1);
    expect(lineas[0]).toContain("nota_indice");
    expect(lineas.slice(1).some((l) => /(^|,)[=+@]/.test(l))).toBe(false);
    const json = await (await request.get(`${RUTA}/datos/${EDICION.edicion}.json`)).json();
    expect(json.sitios).toHaveLength(EDICION.sitios.length);
    expect(json.licencia).toContain("CC BY 4.0");
});

test("el buscador encuentra una institución aunque se escriba sin tildes", async ({ page }) => {
    const s = EDICION.sitios.find((x) => /[áéíóúñ]/i.test(x.nombre)) ?? EDICION.sitios[0]!;
    const parte = s.nombre.split(" ").at(-1)!.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    await page.goto(RUTA);
    await page.getByLabel(/Busca tu municipalidad/).fill(parte);
    await expect(page.locator(".ix-resultados").getByRole("link", { name: new RegExp(s.nombre) }).first()).toBeVisible();
});

test.describe("el revisor", () => {
    test("rechaza IP, nombres locales, puertos, credenciales y dominios que apuntan a redes privadas", async ({ request }) => {
        const malos: [string, string][] = [
            ["http://127.0.0.1/", "url"], ["localhost", "url"], ["http://[::1]/", "url"], ["http://10.0.0.5", "url"],
            ["https://ejemplo.cl:8443/", "url"], ["https://usuario:clave@ejemplo.cl/", "url"], ["file:///etc/passwd", "url"],
            ["localtest.me", "privada"], ["169.254.169.254.nip.io", "privada"],
        ];
        for (const [url, codigo] of malos) {
            const r = await request.post("/api/indice/revisar", { data: { url }, headers: otraIp() });
            expect(r.status(), url).toBe(400);
            expect((await r.json()).codigo, url).toBe(codigo);
        }
    });

    test("limita las revisiones seguidas desde una misma IP", async ({ request }) => {
        const misma = { "cf-connecting-ip": "203.0.113.250" };
        const estados: number[] = [];
        for (let k = 0; k < 7; k++) estados.push((await request.post("/api/indice/revisar", { data: { url: "localhost" }, headers: misma })).status());
        expect(estados.slice(0, 6).every((e) => e === 400)).toBe(true);
        expect(estados[6]).toBe(429);
    });

    test("revisa un sitio público y lo compara con el índice", async ({ page }) => {
        await page.setExtraHTTPHeaders(otraIp());
        await page.goto(`${RUTA}/revisa-tu-sitio`);
        await page.getByLabel("Dirección del sitio").fill("localhost");
        await page.getByRole("button", { name: "Revisar" }).click();
        await expect(page.locator(".ix-revisor-error")).toContainText("no es el nombre de un sitio público");
        await page.getByLabel("Dirección del sitio").fill("example.com");
        await page.getByRole("button", { name: "Revisar" }).click();
        await expect(page.locator(".ix-revisor-total")).toContainText("de 12 controles", { timeout: 20_000 });
        await expect(page.locator(".ix-revisor-resultado .ix-controles li")).toHaveCount(12);
        await expect(page.locator(".ix-revisor-comparado")).toContainText(/más controles que el \d+ %/);
    });
});

test("se llega al índice desde el pie, el sitemap y llms.txt", async ({ page, request }) => {
    await page.goto("/servicios");
    await expect(page.locator("footer").getByRole("link", { name: "Índice web chilena" })).toHaveAttribute("href", RUTA);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`<loc>https://nicoholas.dev${RUTA}</loc>`);
    const s = EDICION.sitios[0]!, c = CATEGORIAS.find((x) => x.id === s.categoria)!;
    expect(sitemap).toContain(`<loc>https://nicoholas.dev${RUTA}/${c.ruta}/${s.slug}</loc>`);
    expect(await (await request.get("/llms.txt")).text()).toContain(`https://nicoholas.dev${RUTA}/metodologia`);
});
