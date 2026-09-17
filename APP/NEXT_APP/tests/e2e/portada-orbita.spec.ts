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
  // Con el foco y no con el ratón: los satélites giran, así que apuntar a uno y esperar
  // a que llegue el hover es perseguir un blanco en movimiento y a veces contesta el de
  // al lado. El componente muestra el nombre igual al recibir el foco, que además es el
  // camino que usa quien navega con el teclado.
  await sec.getByRole("button", { name: "PostgreSQL" }).focus();
  await expect(sec.locator("#orbNombre b")).toHaveText("PostgreSQL");
  await sec.getByRole("button", { name: "Docker" }).click({ force: true });
  await expect(sec.locator("#orbNombre b")).toHaveText("Docker");
  expect(await sec.locator("#orbNombre b").evaluate((el) => getComputedStyle(el).color)).not.toBe("rgb(255, 255, 255)");
});
