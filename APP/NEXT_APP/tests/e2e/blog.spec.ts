import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test("el blog llega con las noticias ya escritas en el HTML, incluso sin JavaScript", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await contexto.newPage();
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Noticias, seguridad");
    // El contenido va en el HTML del servidor: antes la página llegaba vacía.
    await expect(page.locator(".pulso-tarjeta")).toHaveCount(12);
    await expect(page.locator(".pulso-tarjeta h3").first()).not.toBeEmpty();
    await expect(page.locator("#main-content")).toHaveCount(1);
  } finally {
    await contexto.close();
  }
});

test("filtros y paginado recorren las señales sin recargar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  const tarjetas = page.locator(".pulso-tarjeta");
  await expect(tarjetas).toHaveCount(12);

  const primeraDeLaUno = await tarjetas.first().locator("h3").textContent();
  await page.getByRole("button", { name: "Página 2" }).click();
  await expect(page.locator('.pulso-pag[aria-current="page"]')).toHaveText("2");
  expect(await tarjetas.first().locator("h3").textContent()).not.toBe(primeraDeLaUno);

  await page.getByRole("button", { name: "Seguridad", exact: true }).click();
  await expect(page.getByRole("button", { name: "Seguridad", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Al filtrar se vuelve al principio; si caben en una página, el paginado desaparece.
  const paginas = await page.locator('.pulso-pag[aria-current="page"]').count();
  if (paginas > 0) await expect(page.locator('.pulso-pag[aria-current="page"]')).toHaveText("1");
  const marcas = await page.locator(".pulso-marca").allTextContents();
  expect(marcas.every((m) => m === "Seguridad")).toBe(true);

  await page.getByRole("searchbox", { name: "Buscar en las noticias" }).fill("zzzzzzz");
  await expect(page.locator(".pulso-vacio")).toBeVisible();
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(tarjetas).toHaveCount(12);
});

test("la ficha de lectura abre, enlaza a la fuente y se cierra con Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  const titulo = await page.locator(".pulso-tarjeta h3").first().textContent();
  await page.locator(".pulso-tarjeta button").first().click();
  const ficha = page.locator(".pulso-lector");
  await expect(ficha).toBeVisible();
  await expect(ficha.locator("h2")).toHaveText(titulo!.trim());
  const enlace = ficha.getByRole("link", { name: /Leer en/ });
  await expect(enlace).toHaveAttribute("target", "_blank");
  await expect(enlace).toHaveAttribute("rel", /noopener/);
  await expect(enlace).toHaveAttribute("href", /^https?:\/\//);
  await page.keyboard.press("Escape");
  await expect(ficha).toHaveCount(0);
  // El foco vuelve a la tarjeta desde la que se abrió.
  expect(await page.evaluate(() => document.activeElement?.closest(".pulso-tarjeta") !== null)).toBe(true);
});

test("la cápsula de tiempo se abre, muestra el pronóstico y cierra con Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  const pildora = page.getByRole("button", { name: /Abrir el detalle del tiempo|Tiempo en/ });
  await expect(pildora).toHaveAttribute("aria-expanded", "false");
  await pildora.click();
  const panel = page.getByRole("dialog", { name: "Tiempo y hora" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Viento")).toBeVisible();
  await expect(panel.getByText("Amanece")).toBeVisible();
  await expect(panel.getByLabel("Ciudad")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(pildora).toBeFocused();
});

test("las señales laterales se dibujan aunque una fuente falle", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  // El esqueleto lleva el mismo título mientras carga: se espera al panel real.
  const mercado = page.locator('section:not([aria-busy="true"])', { has: page.getByRole("heading", { name: "Mercado" }) });
  await expect(mercado).toBeVisible({ timeout: 20_000 });
  // O hay valores, o un aviso claro; nunca una sección muda.
  const valores = await mercado.locator(".pulso-valor").count();
  if (valores === 0) await expect(mercado.locator(".pulso-fallo")).toBeVisible();
  else expect(valores).toBeGreaterThan(0);
  // Exacto: algún titular del día puede llevar «GitHub» dentro y hacer ambigua la búsqueda.
  await expect(page.getByRole("heading", { name: "GitHub", exact: true })).toBeVisible();
});

test("a 390 px el blog no desborda y la rejilla se apila", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await expect(page.locator(".pulso-tarjeta").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const anchos = await page.locator(".pulso-tarjeta").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(anchos).size).toBe(1);
});
