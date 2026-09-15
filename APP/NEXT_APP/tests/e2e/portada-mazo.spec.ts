import { test, expect } from "@playwright/test";

test("el mazo gira cada carta y congela sus demos fuera de pantalla", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.getElementById("vault")!.scrollIntoView({ block: "center" }));
  const vault = page.locator("#vault");
  await expect(vault).not.toHaveAttribute("aria-busy", "true", { timeout: 15_000 });
  const cartas = vault.locator("[data-demo]");
  await expect(cartas).toHaveCount(3);
  await expect(vault.locator('[data-demo][data-motion-active="true"]').first()).toBeVisible({ timeout: 10_000 });
  const primera = cartas.first();
  await expect(primera).toHaveAttribute("aria-pressed", "false");
  await primera.click();
  await expect(primera).toHaveAttribute("aria-pressed", "true");
  await expect(primera.locator(".p-dorso")).toContainText("Movimientos por categoría");
  await primera.press("Enter");
  await expect(primera).toHaveAttribute("aria-pressed", "false");
  await expect(vault).not.toContainText(/200%|92%|850\+|Auditado/);
  await page.evaluate(() => document.getElementById("contact")!.scrollIntoView({ block: "start" }));
  await page.waitForFunction(() => window.scrollY > 3000);
  await expect(vault.locator('[data-demo][data-motion-active="true"]')).toHaveCount(0, { timeout: 10_000 });
});

test("a 390 px las cartas se apilan sin desbordar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.getElementById("vault")!.scrollIntoView({ block: "start" }));
  const vault = page.locator("#vault");
  await expect(vault).not.toHaveAttribute("aria-busy", "true", { timeout: 15_000 });
  await expect(vault.locator("[data-demo]")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
