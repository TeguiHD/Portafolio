import { expect, test } from "@playwright/test";
import { SERVICIOS } from "../../src/lib/servicios";

/**
 * Páginas de servicio (jugada 3 del informe GEO, 22-11-2026): una por servicio de la portada, cada una responde una
 * pregunta exacta en su primer párrafo (en el HTML del servidor: lo que leen las IA), con su caso real y sus preguntas.
 * Nada inventado: sin precios ni plazos que el titular no haya dado; las cifras del caso llevan fecha y fuente.
 */
const ld = (html: string) => [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1]!)].flat());

test("hay tres servicios, uno por cada opción de la portada", () => {
    expect(SERVICIOS.map((s) => s.slug)).toEqual(["tienda-online", "sistemas-internos", "herramientas-web"]);
});

for (const s of SERVICIOS) {
    test(`${s.slug}: responde la pregunta en su primer párrafo, sin esperar al JavaScript`, async ({ browser }) => {
        const ctx = await browser.newContext({ javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto(`/servicios/${s.slug}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(s.titulo);
        const respuesta = await page.locator(".sv-respuesta").innerText();
        expect(respuesta).toContain("Nicoholas Lopetegui");
        expect(respuesta).toContain("Chile");
        await ctx.close();
    });

    test(`${s.slug}: Service del autor y sus preguntas frecuentes, iguales a las que se ven`, async ({ page, request }) => {
        const html = await (await request.get(`/servicios/${s.slug}`)).text();
        const bloques = ld(html);
        const servicio = bloques.find((b) => b["@type"] === "Service");
        expect(servicio.provider["@id"]).toMatch(/\/#person$/);
        expect(servicio.areaServed.name).toBe("Chile");
        const faq = bloques.find((b) => b["@type"] === "FAQPage");
        expect(faq.mainEntity).toHaveLength(s.faq.length);
        expect(html).toMatch(new RegExp(`<link rel="canonical" href="https://nicoholas.dev/servicios/${s.slug}"`));
        await page.goto(`/servicios/${s.slug}`);
        await expect(page.locator(".sv-faq details")).toHaveCount(s.faq.length);
    });

    test(`${s.slug}: sin precios ni plazos inventados, y el caso con fecha y fuente`, async ({ page }) => {
        await page.goto(`/servicios/${s.slug}`);
        const texto = await page.locator("main").innerText();
        expect(texto).not.toMatch(/\$\s?\d|\d+([.,]\d+)?\s?UF\b|\d+\s?(semanas|días|meses)\b/);
        if (s.caso.medidas.length) expect(texto).toMatch(/Lighthouse[\s\S]*\d{2}-\d{2}-\d{4}/);
    });
}

test("el índice de servicios lleva a los tres", async ({ page }) => {
    await page.goto("/servicios");
    // Cada fila es un enlace con el nombre del servicio y la pregunta que responde.
    for (const s of SERVICIOS) await expect(page.locator(".sv-filas a", { hasText: s.nombre })).toHaveAttribute("href", `/servicios/${s.slug}`);
});

test("desde la portada: la barra lleva a Servicios y cada opción del hero a su servicio", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("#nb-ir").getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
    const tabs = page.getByRole("tablist", { name: "Lo que construyo" });
    for (const [k, s] of SERVICIOS.entries()) {
        await tabs.getByRole("tab").nth(k).click();
        await expect(page.locator(".elige-ejemplo a")).toHaveAttribute("href", `/servicios/${s.slug}`);
    }
});

test("el caso real cambia de celular a escritorio y deja todas las cifras a mano", async ({ page }) => {
    const s = SERVICIOS.find((x) => x.slug === "tienda-online")!;
    await page.goto(`/servicios/${s.slug}`);
    const caso = page.locator("#sv-caso");
    await caso.scrollIntoViewIfNeeded();
    const celular = s.caso.medidas.find((m) => m.dispositivo === "celular")!, escritorio = s.caso.medidas.find((m) => m.dispositivo === "escritorio")!;
    await expect(caso.getByRole("button", { name: "En celular" })).toHaveAttribute("aria-pressed", "true");
    await expect(caso.locator(`progress[aria-label^="Rendimiento"]`)).toHaveAttribute("value", String(celular.rendimiento));
    await caso.getByRole("button", { name: "En escritorio" }).click();
    await expect(caso.locator(`progress[aria-label^="Rendimiento"]`)).toHaveAttribute("value", String(escritorio.rendimiento));
    // La tabla con todo queda en el HTML (para quien lee sin mirar los anillos).
    await caso.getByText("Todas las cifras").click();
    await expect(caso.locator("table tbody tr")).toHaveCount(s.caso.medidas.length);
});

test("se llega desde todo el sitio: barra, pie, sitemap y llms.txt", async ({ page, request }) => {
    await page.goto("/sobre-mi");
    await expect(page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
    await expect(page.locator("footer").getByRole("link", { name: "Servicios" })).toHaveAttribute("href", "/servicios");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const llms = await (await request.get("/llms.txt")).text();
    for (const ruta of ["/servicios", ...SERVICIOS.map((s) => `/servicios/${s.slug}`)]) {
        expect(sitemap, ruta).toContain(`<loc>https://nicoholas.dev${ruta}</loc>`);
        if (ruta !== "/servicios") expect(llms, ruta).toContain(`https://nicoholas.dev${ruta}`);
    }
});
