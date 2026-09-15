import { test, expect } from "@playwright/test";

test("la cinta invita a explorar las herramientas con el texto real", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.getElementById("tools-belt")!.scrollIntoView());
  const cinta = page.locator("#tools-belt");
  await expect(cinta).not.toHaveAttribute("aria-busy", "true", { timeout: 15_000 });
  await expect(cinta.getByText("29 herramientas · sin registro")).toBeVisible();
  await expect(cinta.getByRole("heading", { level: 2 })).toContainText("Las herramientas que uso a diario.");
  await expect(cinta.getByRole("heading", { level: 2 })).toContainText("Úsalas tú también.");
  await expect(cinta.getByRole("link", { name: /Explorar herramientas/ })).toHaveAttribute("href", "/herramientas");
  await expect(cinta).not.toContainText("Menos pasos.");
  await expect(cinta.getByRole("heading", { level: 3, name: "Quitar fondo" })).toBeVisible();
  await expect(cinta.getByRole("heading", { level: 3, name: "Recortar imagen" })).toBeVisible();
});
