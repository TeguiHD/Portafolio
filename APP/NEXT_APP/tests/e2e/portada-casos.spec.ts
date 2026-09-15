import { test, expect } from "@playwright/test";

test("el coverflow fija la sección y cambia de proyecto con scroll y con los puntos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("#projects-title")).toHaveText("De la necesidad al producto");
  await expect(page.locator("#casos article")).toHaveCount(3);
  await page.evaluate(() => document.getElementById("casos")!.scrollIntoView({ block: "start" }));
  await page.waitForFunction(() => window.scrollY > 1000);
  await expect(page.locator('#casos article[aria-current="true"] h3')).toHaveText("FloresDyD");
  await page.getByRole("button", { name: "Ver Herramientas de uso diario" }).click();
  await expect(page.locator('#casos article[aria-current="true"] h3')).toHaveText("Herramientas de uso diario", { timeout: 10_000 });
  await page.getByRole("button", { name: "Ver FloresDyD" }).click();
  await expect(page.locator('#casos article[aria-current="true"] h3')).toHaveText("FloresDyD", { timeout: 10_000 });
  // Lenis ignora la rueda mientras anima el salto al punto: se espera a que el scroll se asiente.
  await page.waitForFunction(() => new Promise((res) => { const y = window.scrollY; setTimeout(() => res(Math.abs(window.scrollY - y) < 1), 400); }));
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 700);
  await expect(page.locator('#casos article[aria-current="true"] h3')).not.toHaveText("FloresDyD", { timeout: 10_000 });
  await expect(page.locator("#casos")).not.toContainText(/200%|92%|850\+|Auditado/);
  await expect(page.locator("#casos").getByRole("heading", { level: 3, name: "FloresDyD" })).toBeVisible();
  await expect(page.locator("#casos").getByRole("link", { name: /Visitar tienda/ })).toHaveAttribute("href", "https://floresdyd.cl");
});

test("sin JavaScript los tres proyectos se ven con su imagen", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("#casos img")).toHaveCount(3);
  await expect(page.locator("#casos")).toContainText("Esquema del proyecto");
  await ctx.close();
});
