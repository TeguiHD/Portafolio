import { test, expect } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

test.describe("Página de autor (E-A-T)", () => {
    test("/sobre-mi responde 200 con canonical propio", async ({ page }) => {
        const response = await page.goto("/sobre-mi");
        expect(response?.status()).toBe(200);
        const canonical = await page
            .locator('link[rel="canonical"]')
            .getAttribute("href");
        expect(canonical).toBe(`${SITE_URL}/sobre-mi`);
    });

    test("/sobre-mi tiene exactamente un h1", async ({ page }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator("h1")).toHaveCount(1);
    });

    test("/sobre-mi enlaza perfiles externos verificables", async ({ page }) => {
        await page.goto("/sobre-mi");
        await expect(page.locator('a[href*="github.com"]').first()).toBeVisible();
        await expect(page.locator('a[href*="linkedin.com"]').first()).toBeVisible();
    });

    test("/sobre-mi está en el sitemap", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        expect(xml).toContain(`<loc>${SITE_URL}/sobre-mi</loc>`);
    });

    test("las herramientas conservan el enlace al autor sin una tarjeta adicional", async ({
        page,
    }) => {
        await page.goto("/herramientas/qr");
        const bio = page.locator('[data-testid="author-bio"]');
        await expect(bio).toHaveCount(0);
        await expect(page.locator("footer").getByRole("link", { name: "Nicoholas Lopetegui" })).toBeVisible();
    });
});
