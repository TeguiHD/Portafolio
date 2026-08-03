import { test, expect } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

const SAMPLE_TOOLS = ["qr", "claves", "base64", "json", "subredes"];

test.describe("Metadata por página", () => {
    test("la home canoniza a sí misma", async ({ page }) => {
        await page.goto("/");
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
        // Next.js resuelve el canonical de la raíz sin slash final (colapsa a
        // `origin` cuando el pathname resuelto es exactamente "/"). Lo que
        // importa es que apunte a la home y no a otra URL.
        expect(canonical).toBe(SITE_URL);
    });

    test("ningún canonical del sitio termina en slash final", async ({ page }) => {
        const routes = ["/", ...SAMPLE_TOOLS.map((slug) => `/herramientas/${slug}`)];
        for (const route of routes) {
            await page.goto(route);
            const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
            expect(canonical).toBeTruthy();
            expect(canonical!.endsWith("/")).toBe(false);
        }
    });

    for (const slug of SAMPLE_TOOLS) {
        test(`/herramientas/${slug} tiene canonical propio`, async ({ page }) => {
            await page.goto(`/herramientas/${slug}`);
            const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
            expect(canonical).toBe(`${SITE_URL}/herramientas/${slug}`);
        });
    }

    test("los títulos de las herramientas son únicos y miden 50-60 caracteres", async ({ page }) => {
        const titles = new Set<string>();
        for (const slug of SAMPLE_TOOLS) {
            await page.goto(`/herramientas/${slug}`);
            const title = await page.title();
            expect(title.length).toBeGreaterThanOrEqual(50);
            expect(title.length).toBeLessThanOrEqual(60);
            expect(titles.has(title)).toBe(false);
            titles.add(title);
        }
    });

    test("las descripciones de las herramientas son únicas", async ({ page }) => {
        const descriptions = new Set<string>();
        for (const slug of SAMPLE_TOOLS) {
            await page.goto(`/herramientas/${slug}`);
            const desc = await page
                .locator('meta[name="description"]')
                .getAttribute("content");
            expect(desc).toBeTruthy();
            expect(descriptions.has(desc!)).toBe(false);
            descriptions.add(desc!);
        }
    });

    test("la imagen Open Graph resuelve", async ({ page, request }) => {
        await page.goto("/");
        const ogImage = await page
            .locator('meta[property="og:image"]')
            .getAttribute("content");
        expect(ogImage).toBeTruthy();
        const response = await request.get(ogImage!);
        expect(response.status()).toBe(200);
    });
});
