import { expect, type Page } from "@playwright/test";

/**
 * Lleva la vista a una sección diferida de la portada y espera a que cargue.
 * Espera primero a que el motor de movimiento esté listo (la maquetación deja de
 * moverse: fuentes, fijado del coverflow) y vuelve a desplazar cada segundo, como
 * haría una persona, hasta que la sección deja de estar ocupada.
 */
export async function irASeccion(page: Page, id: string, tiempo = 30_000) {
  await page.waitForFunction(() => document.querySelector(".p-progreso")?.getAttribute("data-nivel") === "completo", null, { timeout: 15_000 }).catch(() => {});
  const inicio = Date.now();
  while (Date.now() - inicio < tiempo) {
    await page.evaluate((sid) => document.getElementById(sid)?.scrollIntoView({ block: "start" }), id);
    const ocupada = await page.evaluate((sid) => document.getElementById(sid)?.getAttribute("aria-busy") === "true", id);
    if (!ocupada) break;
    await page.waitForTimeout(1000);
  }
  await expect(page.locator(`#${id}`)).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });
}

/**
 * Da la primera señal de que hay alguien delante y espera a que la portada reaccione.
 *
 * En reposo la portada no monta más que el instrumento del frente ni carga el motor de
 * movimiento; todo eso llega con el primer gesto. Un solo `mouse.move` no basta porque
 * puede llegar antes de que la página hidrate y no haya quien lo escuche.
 */
export async function despertarPortada(page: Page, instrumentos = 4) {
  await expect(page.locator(".p-mesa")).toHaveCount(1, { timeout: 20_000 });
  for (let i = 0; i < 12; i++) {
    if ((await page.locator("[data-instrumento]").count()) >= instrumentos) break;
    await page.mouse.move(700 + i * 4, 500 + i * 3);
    await page.waitForTimeout(200);
  }
  await expect(page.locator("[data-instrumento]")).toHaveCount(instrumentos, { timeout: 15_000 });
}
