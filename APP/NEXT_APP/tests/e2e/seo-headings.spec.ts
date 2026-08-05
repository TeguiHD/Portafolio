import { test, expect } from "@playwright/test";

const PAGES = ["/", "/herramientas", "/sobre-mi", "/blog"];
const TOOLS = ["qr", "claves", "base64", "json", "subredes"];

test.describe("Jerarquía de encabezados", () => {
    for (const path of PAGES) {
        test(`${path} tiene exactamente un h1 en el DOM`, async ({ page }) => {
            await page.goto(path);
            await expect(page.locator("h1")).toHaveCount(1);
        });
    }

    for (const slug of TOOLS) {
        test(`/herramientas/${slug} tiene exactamente un h1 en el HTML crudo`, async ({
            request,
        }) => {
            // Sin ejecutar JavaScript: es lo que ven los crawlers que no renderizan.
            const html = await (await request.get(`/herramientas/${slug}`)).text();
            const count = (html.match(/<h1[\s>]/g) ?? []).length;
            expect(count, `HTML crudo con ${count} h1`).toBeLessThanOrEqual(1);
        });
    }

    test("el aviso de noscript no usa h1", async ({ request }) => {
        const html = await (await request.get("/")).text();
        const noscript = /<noscript>([\s\S]*?)<\/noscript>/g;
        for (const match of html.matchAll(noscript)) {
            expect(match[1], "el bloque noscript no debe contener un h1").not.toMatch(
                /<h1[\s>]/
            );
        }
    });
});
