import { test, expect } from "@playwright/test";

test("contacto sin las dos tarjetas y con el formulario intacto", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.getElementById("contact")!.scrollIntoView());
  const sec = page.locator("#contact");
  await expect(sec).not.toHaveAttribute("aria-busy", "true", { timeout: 15_000 });
  await expect(sec).not.toContainText("Velocidad de ejecución");
  await expect(sec).not.toContainText("Calidad industrial");
  await expect(sec.getByRole("heading", { level: 2 })).toContainText("Hablemos de tu");
  await expect(sec.getByRole("button", { name: "Enviar Mensaje" })).toBeVisible();
  // Los chips de la columna izquierda se retiraron a petición: queda el texto y el formulario.
  await expect(sec.getByText("Respuesta rápida")).toHaveCount(0);
  await expect(sec.getByText("Propuesta clara")).toHaveCount(0);
  await expect(sec.getByText("Sin spam")).toHaveCount(0);
});
