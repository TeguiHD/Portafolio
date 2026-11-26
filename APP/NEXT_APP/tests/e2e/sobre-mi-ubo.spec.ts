import { expect, test, type Page } from "@playwright/test";

/**
 * La auditoría del 25-11-2026 encontró que la ficha del autor (lo que leen Google y las IA) decía solo «Desarrollador
 * Full Stack», y «Sobre mí» terminaba en 2024: sin la UBO, la docencia ni la solicitud de patente. Los datos salen de lo
 * que dio el dueño, del programa público del diplomado y del sitio de SapIA (sapia.ubo.cl).
 */
const DIPLOMADO = "https://educacioncontinua.ubo.cl/diplomados/inteligencia-artificial-generativa-aplicada/";

async function persona(page: Page): Promise<Record<string, unknown>> {
    const bloques = await page.locator('script[type="application/ld+json"]').evaluateAll((ns) => ns.map((n) => n.textContent ?? ""));
    const p = bloques.map((b) => JSON.parse(b) as Record<string, unknown>).find((s) => s["@type"] === "Person");
    expect(p, "la página emite Person").toBeTruthy();
    return p!;
}

test.describe("autor: la UBO, la docencia y la solicitud de patente", () => {
    test("la ficha Person dice dónde trabaja y qué hace", async ({ page }) => {
        await page.goto("/sobre-mi");
        const p = await persona(page);
        expect(p.jobTitle).toEqual(expect.arrayContaining(["Desarrollador full stack", "Técnico de gestión y plataformas académicas"]));
        expect(p.worksFor).toMatchObject({ "@type": "CollegeOrUniversity", name: "Universidad Bernardo O'Higgins", url: "https://www.ubo.cl/" });
        expect(String(p.description)).toContain("Universidad Bernardo O'Higgins");
        expect(String(p.description)).toContain("solicitud de patente");
        expect(String(p.description)).toContain("ZA 2025/10601");
        expect(String(p.description)).not.toMatch(/patente (concedida|otorgada)/);
    });

    test("la portada emite la misma ficha", async ({ page }) => {
        await page.goto("/");
        const p = await persona(page);
        expect(p.worksFor).toMatchObject({ name: "Universidad Bernardo O'Higgins" });
    });

    test("«Sobre mí» cuenta el trabajo en la UBO, el diplomado y la solicitud de patente", async ({ page }) => {
        await page.goto("/sobre-mi");
        const main = page.locator("main");
        await expect(main.getByRole("heading", { level: 2, name: "En la UBO" })).toBeVisible();
        await expect(main).toContainText("técnico de gestión y plataformas académicas");
        await expect(main).toContainText("Sección de Articulación y Promoción de la Inteligencia Artificial en la Academia");
        await expect(main).toContainText("¿Cómo optimizar tareas con IA?");
        await expect(main).toContainText("Creación de propuestas de soluciones innovadoras con IA");
        await expect(main).toContainText("Moodle");
        await expect(main).toContainText("Universidad de Chile");
        await expect(main.locator(`a[href="${DIPLOMADO}"]`)).toHaveCount(1);
        await expect(main).toContainText("solicitud de patente ZA 2025/10601");
        await expect(main.locator(".sm-anios")).toContainText("2026");
    });

    test("la descripción de «Sobre mí» nombra la UBO y cabe en un resultado de búsqueda", async ({ page }) => {
        await page.goto("/sobre-mi");
        const d = await page.locator('meta[name="description"]').getAttribute("content");
        expect(d).toContain("UBO");
        expect(d!.length).toBeLessThanOrEqual(160);
    });

    test("llms.txt resume lo mismo para los modelos de lenguaje", async ({ request }) => {
        const t = await (await request.get("/llms.txt")).text();
        expect(t).toContain("Universidad Bernardo O'Higgins");
        expect(t).toContain("Diplomado en Inteligencia Artificial Generativa Aplicada");
        expect(t).toContain("solicitud de patente ZA 2025/10601");
        expect(t).toContain(DIPLOMADO);
    });
});
