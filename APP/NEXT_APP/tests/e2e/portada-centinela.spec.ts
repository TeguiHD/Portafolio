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
  // La lista de prácticas y el crédito visible del núcleo se retiraron a petición;
  // la licencia MIT sigue en docs/licencias/ y en la cabecera de matrixOrb.ts.
  await expect(sec.getByText("Matrix Orb")).toHaveCount(0);
  await expect(sec).not.toContainText("CSP con nonces dinámicos");
  await expect(sec).not.toContainText("Encriptación en reposo");
  await expect(sec.locator("canvas")).toHaveCount(1);
});

test("la petición se puede arrastrar: el anillo que la frena no la deja pasar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await irASeccion(page, "architecture");
  const sec = page.locator("#architecture");
  await sec.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await sec.getByRole("button", { name: /Inyección SQL/ }).click();
  await page.waitForTimeout(1200);

  // La ficha descansa fuera del anillo, a la vista, y se puede coger.
  const ficha = await sec.locator(".p-rayo .pdot").boundingBox();
  const escena = await sec.locator(".p-centinela").boundingBox();
  expect(ficha).not.toBeNull();
  const cx = escena!.x + escena!.width / 2;
  const cy = escena!.y + escena!.height / 2;

  await page.mouse.move(ficha!.x + 7, ficha!.y + 7);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(ficha!.x + 7 + ((cx - ficha!.x - 7) * k) / 10, ficha!.y + 7 + ((cy - ficha!.y - 7) * k) / 10);
    await page.waitForTimeout(60);
  }
  await expect(sec.locator(".p-anillo-seg.mal")).toHaveCount(1, { timeout: 5000 });
  await expect(sec.getByRole("status").first()).toHaveText("Bloqueando");
  await expect(sec.locator("#term")).toContainText("HTTP/2 400", { timeout: 8000 });
  // El núcleo nunca se alcanza: la ficha se queda en el borde del anillo que frena.
  const parada = await sec.locator(".p-rayo .pdot").boundingBox();
  expect(Math.hypot(parada!.x + 7 - cx, parada!.y + 7 - cy)).toBeGreaterThan(40);
  await page.mouse.up();
});

test("una petición legítima llega al núcleo arrastrándola", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await irASeccion(page, "architecture");
  const sec = page.locator("#architecture");
  await sec.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await sec.getByRole("button", { name: /Visita normal/ }).click();
  await page.waitForTimeout(1200);

  const ficha = await sec.locator(".p-rayo .pdot").boundingBox();
  const escena = await sec.locator(".p-centinela").boundingBox();
  const cx = escena!.x + escena!.width / 2;
  const cy = escena!.y + escena!.height / 2;
  await page.mouse.move(ficha!.x + 7, ficha!.y + 7);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(ficha!.x + 7 + ((cx - ficha!.x - 7) * k) / 10, ficha!.y + 7 + ((cy - ficha!.y - 7) * k) / 10);
    await page.waitForTimeout(60);
  }
  await expect(sec.locator(".p-anillo-seg.toca")).toHaveCount(4, { timeout: 6000 });
  await expect(sec.locator(".p-anillo-seg.mal")).toHaveCount(0);
  await expect(sec.locator("#term")).toContainText("content-security-policy", { timeout: 8000 });
  await page.mouse.up();
});
