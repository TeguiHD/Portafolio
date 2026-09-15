import { test, expect } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test("contacto sin las dos tarjetas y con el formulario intacto", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  // Con `irASeccion` en vez de un salto seco: desplazarse antes de hidratar deja la
  // sección fuera de vista cuando el resto crece, y su observador no llega a dispararse.
  await irASeccion(page, "contact");
  const sec = page.locator("#contact");
  await expect(sec).not.toContainText("Velocidad de ejecución");
  await expect(sec).not.toContainText("Calidad industrial");
  await expect(sec.getByRole("heading", { level: 2 })).toContainText("Hablemos de tu");
  await expect(sec.getByRole("button", { name: "Enviar Mensaje" })).toBeVisible();
  // Los chips de la columna izquierda se retiraron a petición: queda el texto y el formulario.
  await expect(sec.getByText("Respuesta rápida")).toHaveCount(0);
  await expect(sec.getByText("Propuesta clara")).toHaveCount(0);
  await expect(sec.getByText("Sin spam")).toHaveCount(0);
});
