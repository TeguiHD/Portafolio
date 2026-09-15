import { expect, test, type Page } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test.setTimeout(150_000);

async function home(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toBeVisible();
}

/** Deja la firma de cierre a la vista, con las secciones diferidas ya cargadas. */
async function cierre(page: Page) {
  for (const id of ["tools-belt", "vault", "tecnologias", "architecture", "contact"]) {
    await irASeccion(page, id);
  }
  await page.locator("#closing-signature").evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
}

test("el hero pinta su párrafo desde el primer frame y el cierre queda sin textos añadidos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await home(page);
  const parrafo = page.locator("#hero p").first();
  await expect(parrafo).toHaveCSS("visibility", "visible");
  await expect(parrafo).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-instrumento]")).toHaveCount(4);
  const firma = page.locator("#closing-signature");
  await expect(firma).not.toContainText("Ideas en movimiento");
  await expect(firma).not.toContainText("Forma. Código. Producto.");
  await expect(firma).not.toContainText("Cada idea encuentra su forma");
});

test("la pausa persiste, conserva el texto y libera el lienzo de la firma fuera de pantalla", async ({ page }) => {
  await home(page);
  await cierre(page);
  const firma = page.locator("#closing-signature");
  await expect(firma).toHaveAttribute("data-listo", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "Pausar efectos" }).click();
  await expect(firma).toHaveAttribute("data-estado", "pausado");
  await expect(firma).toHaveAttribute("data-listo", "false");
  await expect(firma.locator(".p-firma-txt")).toBeVisible();
  expect(await firma.locator("canvas").evaluate((element: HTMLCanvasElement) => element.width)).toBe(1);
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await expect(page.locator('[data-motion-active="true"]')).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Activar efectos" })).toBeVisible();
  await page.getByRole("button", { name: "Activar efectos" }).click();
  expect(await page.locator("[data-hero-content]").evaluate(element => [...element.querySelectorAll("*")].every(node => getComputedStyle(node).opacity === "1"))).toBe(true);
  await cierre(page);
  await expect(firma).toHaveAttribute("data-listo", "true", { timeout: 20_000 });
  await page.locator("#casos").scrollIntoViewIfNeeded();
  await expect(firma).toHaveAttribute("data-estado", "pausado");
  expect(await firma.locator("canvas").evaluate((element: HTMLCanvasElement) => element.width)).toBe(1);
});

test("movimiento reducido y ahorro de datos dejan la firma en texto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  const firma = page.locator("#closing-signature");
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await firma.scrollIntoViewIfNeeded();
  await expect(firma).toHaveAttribute("data-listo", "false");
  await expect(firma.locator(".p-firma-txt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pausar efectos" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await cierre(page);
  await expect(firma).toHaveAttribute("data-listo", "true", { timeout: 20_000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(firma).toHaveAttribute("data-estado", "pausado");
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true, addEventListener() {}, removeEventListener() {} }, configurable: true }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await home(page);
  await cierre(page);
  await expect(firma).toHaveAttribute("data-listo", "false");
  await expect(firma.locator(".p-firma-txt")).toBeVisible();
});

test("un lienzo no disponible mantiene el nombre y la navegación", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
  await home(page);
  await cierre(page);
  await expect(page.locator("#closing-signature")).toHaveAttribute("data-estado", "sin-lienzo");
  await expect(page.locator(".p-firma-txt")).toBeVisible();
  await page.locator("footer").getByRole("link", { name: "Proyectos", exact: true }).click();
  await expect(page).toHaveURL(/#casos$/);
});

test("las demos del mazo se congelan al pausar y no trabajan fuera de pantalla", async ({ page }) => {
  await home(page);
  await irASeccion(page, "vault");
  await page.locator("#vault").evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" }));
  const cards = page.locator("#vault [data-demo]");
  await expect(cards).toHaveCount(3);
  await expect.poll(() => page.locator('#vault [data-demo][data-motion-active="true"]').count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pausar efectos" }).click();
  await expect(page.locator('#vault [data-demo][data-motion-active="true"]')).toHaveCount(0);
  await page.waitForTimeout(1200);
  const snapshots = await cards.evaluateAll(elements => elements.map(element => element.innerHTML));
  await page.waitForTimeout(3600);
  expect(await cards.evaluateAll(elements => elements.map(element => element.innerHTML))).toEqual(snapshots);
  await page.getByRole("button", { name: "Activar efectos" }).click();
  await expect.poll(() => page.locator('#vault [data-demo][data-motion-active="true"]').count()).toBeGreaterThan(0);
  await page.evaluate(() => document.getElementById("contact")!.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect(page.locator('#vault [data-demo][data-motion-active="true"]')).toHaveCount(0);
});

test("portada sin desbordamientos y navegación visible al recibir foco", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#casos").scrollIntoViewIfNeeded();
  const navLink = page.locator("header").getByRole("link", { name: "Herramientas", exact: true });
  await navLink.focus();
  await expect(navLink).toBeInViewport();
  await page.evaluate(() => window.scrollBy(0, 100));
  await expect(navLink).toBeInViewport();
});

test("sin JavaScript hay proyectos con imágenes, enlaces y un footer al final", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await home(page);
    await expect(page.locator("#casos img")).toHaveCount(3);
    await expect(page.locator("#casos")).toContainText("Esquema del proyecto");
    await expect(page.locator("footer").getByRole("link", { name: "Privacidad", exact: true })).toHaveAttribute("href", "/privacidad");
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    expect(await page.locator("footer").evaluate(element => Math.abs(element.getBoundingClientRect().bottom - innerHeight))).toBeLessThanOrEqual(1);
  } finally { await context.close(); }
});
