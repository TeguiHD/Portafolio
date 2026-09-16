import { test, expect, type Page } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test.setTimeout(150_000);

/** Deja la firma de cierre en el centro de la pantalla, con las secciones diferidas ya cargadas. */
async function irALaFirma(page: Page) {
  for (const id of ["tools-belt", "vault", "tecnologias", "architecture", "contact"]) {
    await irASeccion(page, id);
  }
  await page.locator("#closing-signature").evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
}

/** Mayor desvío medio (en píxeles) que alcanza la firma durante el próximo medio segundo. */
async function pico(page: Page) {
  return page.evaluate(async () => {
    const firma = document.querySelector<HTMLElement>("#closing-signature")!;
    let max = 0;
    for (let i = 0; i < 40; i++) {
      max = Math.max(max, Number(firma.dataset.desvio ?? 0));
      await new Promise((listo) => requestAnimationFrame(listo));
    }
    return max;
  });
}

test("el nombre se forma con partículas y el bucle se duerme al asentarse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const firma = page.locator("#closing-signature");
  await irALaFirma(page);
  await expect(firma).toHaveAttribute("data-listo", "true", { timeout: 20_000 });
  const lienzo = firma.locator("canvas");
  expect(Number(await lienzo.getAttribute("data-particulas"))).toBeGreaterThan(600);
  // El nombre también está en texto: es lo que leen el lector de pantalla y quien no ve el lienzo.
  await expect(firma.locator(".p-firma-txt")).toHaveText("nicoholas.dev");
  await expect(firma).toHaveAttribute("data-estado", "reposo", { timeout: 15_000 });
  await expect(firma).toHaveAttribute("data-desvio", "0");
  // Por id: un `footer` a secas también engancha el del aviso de errores de `next dev`.
  await expect(page.locator("footer#site-footer")).toBeVisible();
});

test("el puntero repele las partículas, el clic las dispersa y todas vuelven a su letra", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const firma = page.locator("#closing-signature");
  await irALaFirma(page);
  await expect(firma).toHaveAttribute("data-estado", "reposo", { timeout: 20_000 });

  const caja = (await firma.locator("canvas").boundingBox())!;
  const centro = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
  await page.mouse.move(centro.x, centro.y);
  await page.mouse.move(centro.x + 40, centro.y + 8, { steps: 6 });
  await expect(firma).toHaveAttribute("data-estado", "activo");
  const conRaton = await pico(page);
  expect(conRaton).toBeGreaterThan(2);

  const muestreo = pico(page);
  await page.mouse.down();
  await page.mouse.up();
  // La detonación mueve toda la firma, mucho más lejos que el hueco del puntero.
  expect(await muestreo).toBeGreaterThan(Math.max(12, conRaton * 2));

  await page.mouse.move(5, 5);
  await expect(firma).toHaveAttribute("data-estado", "reposo", { timeout: 10_000 });
  await expect(firma).toHaveAttribute("data-desvio", "0");
});

test("a 390 px la firma se forma y no atrapa el scroll del dedo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const firma = page.locator("#closing-signature");
  await irALaFirma(page);
  await expect(firma).toHaveAttribute("data-listo", "true", { timeout: 20_000 });
  expect(Number(await firma.locator("canvas").getAttribute("data-particulas"))).toBeGreaterThan(300);
  // Sin touch-action: none, deslizar sobre la firma sigue desplazando la página.
  expect(await firma.locator("canvas").evaluate((element) => getComputedStyle(element).touchAction)).not.toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
