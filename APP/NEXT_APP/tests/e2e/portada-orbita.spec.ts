import { test, expect } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test("la órbita revela el nombre de la tecnología en el centro", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await irASeccion(page, "tecnologias");
  const sec = page.locator("#tecnologias");
  await expect(sec.getByRole("heading", { level: 2 })).toContainText("Una base");
  await expect(sec.locator("button.p-satelite")).toHaveCount(12);
  await expect(sec.locator("#orbNombre b")).toHaveText("");
  await sec.getByRole("button", { name: "PostgreSQL" }).hover({ force: true });
  await expect(sec.locator("#orbNombre b")).toHaveText("PostgreSQL");
  await sec.getByRole("button", { name: "Docker" }).click({ force: true });
  await expect(sec.locator("#orbNombre b")).toHaveText("Docker");
  expect(await sec.locator("#orbNombre b").evaluate((el) => getComputedStyle(el).color)).not.toBe("rgb(255, 255, 255)");
});
