import { test, expect } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test("el centinela bloquea una inyección y deja pasar una petición normal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await irASeccion(page, "architecture");
  const sec = page.locator("#architecture");
  await expect(sec.getByRole("heading", { level: 2 })).toContainText("La seguridad no es un extra.");
  await sec.getByRole("button", { name: /Inyección SQL/ }).click();
  await expect(sec.getByRole("status")).toHaveText("Bloqueando", { timeout: 8000 });
  await expect(sec.locator("#term")).toContainText("HTTP/2 400", { timeout: 8000 });
  await sec.getByRole("button", { name: /Visita normal/ }).click();
  await expect(sec.locator("#term")).toContainText("curl -I https://nicoholas.dev", { timeout: 8000 });
  await expect(sec.locator("#term")).toContainText("content-security-policy", { timeout: 8000 });
  await expect(sec.getByRole("status")).toHaveText("Correcto", { timeout: 8000 });
  await expect(sec.getByText("Matrix Orb")).toBeVisible();
  await expect(sec).toContainText("CSP con nonces dinámicos");
  await expect(sec.locator("canvas")).toHaveCount(1);
});
