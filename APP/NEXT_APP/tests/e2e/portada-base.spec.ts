import { test, expect } from "@playwright/test";

test("la base de la portada: fondo vivo, barra de progreso, tipografía y sin desbordamientos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toBeVisible();
  await expect(page.locator("[data-landing-background]")).toHaveCount(1);
  await expect(page.locator(".p-progreso")).toHaveAttribute("data-nivel", "completo");
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/Inter/);
  const parrafo = page.locator("#hero p").first();
  await expect(parrafo).toHaveCSS("visibility", "visible");
  await expect(parrafo).toHaveCSS("opacity", "1");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("movimiento reducido: nivel estático, sin fondo", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toBeVisible();
  await expect(page.locator(".p-progreso")).toHaveAttribute("data-nivel", "estatico");
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await ctx.close();
});

test("pausar efectos apaga el fondo y persiste al recargar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Pausar efectos" }).click();
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await expect(page.locator(".p-progreso")).toHaveAttribute("data-nivel", "estatico");
  await page.reload();
  await expect(page.getByRole("button", { name: "Activar efectos" })).toBeVisible();
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
});
