import { expect, test, type Page } from "@playwright/test";
import { irASeccion } from "./portada-utils";

test.setTimeout(150_000);

async function home(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Usar herramientas", exact: true })).toBeVisible();
}

/** Espejo de FRACCION_RECORRIDO en ClosingSignature.tsx: la coreografia termina
 *  antes de que el panel se despegue, para que la constelacion final se vea
 *  completa antes del footer. Si cambia alli, cambia aqui. */
const FRACCION_RECORRIDO = 0.68;

async function closing(page: Page, progress: number) {
  for (const id of ["tools-belt", "vault", "tecnologias", "architecture", "contact"]) {
    await irASeccion(page, id);
  }
  await page.evaluate(value => {
    const section = document.querySelector("#closing-signature")!;
    const top = scrollY + section.getBoundingClientRect().top - innerHeight * 0.8 + value.progress * (section.clientHeight + innerHeight * 0.2) * value.fraccion;
    window.scrollTo({ top, behavior: "instant" });
  }, { progress, fraccion: FRACCION_RECORRIDO });
}

test("el hero pinta su párrafo desde el primer frame y el cierre queda sin textos añadidos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await home(page);
  const parrafo = page.locator("#hero p").first();
  await expect(parrafo).toHaveCSS("visibility", "visible");
  await expect(parrafo).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-instrumento]")).toHaveCount(4);
  const closingSection = page.locator("#closing-signature");
  await expect(closingSection).not.toContainText("Ideas en movimiento");
  await expect(closingSection).not.toContainText("Forma. Código. Producto.");
  await expect(closingSection).not.toContainText("Cada idea encuentra su forma");
});

test("el nombre se forma, se completa en constelación y solo después llega el footer", async ({ page }) => {
  await home(page);
  const canvas = page.locator(".closing-signature canvas");
  await expect(canvas).toHaveAttribute("data-state", "static");
  await closing(page, 0.12);
  await expect(canvas).toHaveAttribute("data-state", "forming");
  await closing(page, 0.545);
  await expect(canvas).toHaveAttribute("data-state", "signature");
  await expect(page.locator(".closing-signature")).toBeInViewport();
  const progress = await canvas.getAttribute("data-progress");
  await page.waitForTimeout(400);
  await expect(canvas).toHaveAttribute("data-progress", progress!);
  await closing(page, 1);
  await expect(canvas).toHaveAttribute("data-state", "constellation");
  await expect(page.locator(".closing-signature")).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator("footer")).not.toBeInViewport();
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect(page.locator("footer")).toBeInViewport();
  await expect(canvas).toHaveAttribute("data-state", "constellation");
  expect(await page.locator("footer").evaluate(element => Math.abs(element.getBoundingClientRect().bottom - innerHeight))).toBeLessThanOrEqual(1);
});

test("la pausa persiste, conserva el texto y libera el canvas fuera de pantalla", async ({ page }) => {
  await home(page);
  await closing(page, 0.545);
  const canvas = page.locator(".closing-signature canvas");
  await expect(canvas).toHaveAttribute("data-state", "signature");
  await page.getByRole("button", { name: "Pausar efectos" }).click();
  await expect(canvas).toHaveAttribute("data-state", "paused");
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await expect(page.locator('[data-motion-active="true"]')).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Activar efectos" })).toBeVisible();
  await page.getByRole("button", { name: "Activar efectos" }).click();
  expect(await page.locator("[data-hero-content]").evaluate(element => [...element.querySelectorAll("*")].every(node => getComputedStyle(node).opacity === "1"))).toBe(true);
  await closing(page, 0.545);
  await expect(canvas).toHaveAttribute("data-state", "signature");
  await page.locator("#casos").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-state", "paused");
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.width)).toBe(1);
});

test("movimiento reducido y ahorro de datos evitan cargar la escena", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  await expect(page.locator("[data-landing-background]")).toHaveCount(0);
  await page.locator("#closing-signature").scrollIntoViewIfNeeded();
  await expect(page.locator(".closing-signature canvas")).toHaveAttribute("data-state", "static");
  await expect(page.getByRole("button", { name: "Pausar efectos" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await closing(page, 0.545);
  await expect(page.locator(".closing-signature canvas")).toHaveAttribute("data-state", "signature");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".closing-signature canvas")).toHaveAttribute("data-state", "paused");
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true, addEventListener() {}, removeEventListener() {} }, configurable: true }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await home(page);
  await closing(page, 0.545);
  await expect(page.locator(".closing-signature canvas")).toHaveAttribute("data-state", "static");
});

test("un canvas no disponible mantiene el cierre y la navegación", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
  await home(page);
  await closing(page, 0.545);
  await expect(page.locator(".closing-signature-fallback")).toBeVisible();
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
