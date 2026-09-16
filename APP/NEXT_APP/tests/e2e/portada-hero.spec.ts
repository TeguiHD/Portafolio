import { test, expect } from "@playwright/test";
import { despertarPortada } from "./portada-utils";

test("la mesa giratoria muestra un instrumento al frente y cambia al pulsar un punto", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  // En reposo solo está montado el instrumento del frente; los otros tres llegan con la
  // primera señal de que hay alguien (así la portada hidrata 737 nodos y no 1059).
  await expect(page.locator("[data-instrumento]")).toHaveCount(1);
  await despertarPortada(page);
  await expect(page.locator("[data-frente='true'] [data-instrumento]")).toHaveCount(1);
  // El primero del carrusel es el generador de QR (ver datos/instrumentos.ts).
  await expect(page.locator("[data-frente='true'] [data-instrumento]")).toHaveAttribute("data-instrumento", "qr");
  await expect(page.locator(".p-instrumento-pos:not([inert])")).toHaveCount(1);
  await page.getByRole("tab", { name: "Extractor de paleta" }).click();
  await expect(page.locator("[data-frente='true'] [data-instrumento]")).toHaveAttribute("data-instrumento", "paleta");
  await expect(page.locator(".p-instrumento-pos:not([inert])")).toHaveCount(1);
  // el párrafo LCP nunca se retiene ni se anima
  const parrafo = page.locator("#hero p").first();
  await expect(parrafo).toHaveCSS("visibility", "visible");
  await expect(parrafo).toHaveCSS("opacity", "1");
  await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toBeVisible();
});

test("las demostraciones paran cuando el hero sale de pantalla y al pausar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  // Las demos esperan a que haya alguien delante: mover el puntero es esa señal, y
  // tiene que llegar con la página ya hidratada, que es cuando hay quien la escuche.
  await despertarPortada(page);
  // Varios movimientos con pausa: uno solo puede llegar antes de que el hero escuche.
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(700 + i * 3, 500 + i * 2);
    await page.waitForTimeout(120);
  }
  await expect(page.locator("[data-frente='true']")).toHaveAttribute("data-motion-active", "true", { timeout: 10_000 });
  // Con la rueda, como una persona: Lenis virtualiza el scroll y un `scrollIntoView`
  // directo pelea con su posición interna.
  for (let i = 0; i < 14 && (await page.evaluate(() => window.scrollY)) < 1600; i++) {
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(220);
  }
  await page.waitForFunction(() => window.scrollY > 1500, null, { timeout: 15_000 });
  await expect(page.locator('[data-motion-active="true"][data-frente]')).toHaveCount(0, { timeout: 10_000 });
  // De vuelta arriba con la rueda: Lenis virtualiza el scroll y un `scrollTo` directo
  // pelea con su posición interna.
  await page.mouse.move(700, 500);
  for (let i = 0; i < 12 && (await page.evaluate(() => window.scrollY)) > 50; i++) {
    await page.mouse.wheel(0, -2400);
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => window.scrollY < 50, null, { timeout: 15_000 });
  await expect(page.locator("[data-frente='true']")).toHaveAttribute("data-motion-active", "true", { timeout: 10_000 });
  await page.getByRole("button", { name: "Pausar efectos" }).click();
  await expect(page.locator('[data-motion-active="true"][data-frente]')).toHaveCount(0);
});

test("el instrumento del frente responde al usuario: el recorte cambia de proporción", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  // La mesa llega en su propio chunk y los instrumentos de atrás, con el primer gesto:
  // pulsar antes de que existan no cambia nada.
  await despertarPortada(page);
  await page.getByRole("tab", { name: "Recortar imagen" }).click();
  const recortar = page.locator("[data-instrumento='recortar']");
  await expect(recortar).toBeVisible();
  await recortar.getByRole("button", { name: "16:9" }).click();
  await expect(recortar.getByRole("button", { name: "16:9" })).toHaveAttribute("aria-pressed", "true");
  await expect(recortar.locator(".mesa-cabecera-nombre .detalle")).toContainText("×");
});

test("a 390 px la mesa cabe sin desbordar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // En móvil la mesa llega con la primera interacción (aquí, un scroll mínimo tras hidratar).
  await expect(page.locator(".p-mesa")).toHaveCount(1);
  await expect(page.locator(".p-progreso")).toHaveAttribute("data-nivel", "medio");
  await page.evaluate(() => window.scrollBy(0, 1));
  await despertarPortada(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
