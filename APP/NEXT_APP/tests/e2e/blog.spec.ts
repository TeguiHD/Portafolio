import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

/** /blog con el lenguaje de la portada: tambor como cabecera, índice en filas, GitHub y Radar. */

test("el blog llega con los titulares ya escritos, incluso sin JavaScript", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("/blog", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("Blog");
  // Sin scripts «Ver más» no sirve: llegan todos los titulares (el resto, dentro de <noscript>).
  expect(await page.locator(".bp-fila").count()).toBeGreaterThanOrEqual(12);
  // Visibles de verdad: no basta con que lleguen dentro de un bloque oculto del streaming.
  await expect(page.locator(".bp-fila h3").first()).toBeVisible();
  await expect(page.locator(".bp-fila h3").first()).not.toBeEmpty();
  // Sin scripts no se abre la ficha, pero cada fila lleva igual a su fuente.
  await expect(page.locator(".bp-fila a.bp-fuente").first()).toBeVisible();
  expect(await page.locator('.bp-fila a.bp-fuente[href^="http"]').count()).toBe(await page.locator(".bp-fila").count());
  await contexto.close();
});

test("temas, búsqueda y «ver más» recorren los titulares sin recargar", async ({ page }) => {
  await page.goto("/blog");
  const filas = page.locator(".bp-fila");
  await expect(filas).toHaveCount(12);
  const total = Number(await page.locator('#bp-temas button[aria-pressed="true"] small').textContent());
  if (total > 12) {
    await page.getByRole("button", { name: "Ver más titulares" }).click();
    await expect(filas).toHaveCount(Math.min(24, total));
  }
  const tema = page.locator("#bp-temas button").nth(1);
  await tema.click();
  await expect(tema).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("searchbox", { name: "Buscar en las noticias" }).fill("zzzzzzz");
  await expect(page.locator(".bp-vacio")).toBeVisible();
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(filas.first()).toBeVisible();
  // El botón desaparece: el foco pasa al buscador en vez de perderse.
  await expect(page.getByRole("searchbox", { name: "Buscar en las noticias" })).toBeFocused();
  // El nombre de cada tema lleva su número separado («IA 25», no «IA25»).
  await expect(page.locator("#bp-temas button").first()).toHaveAccessibleName(/^Todo \d+$/);
  await expect(page.locator('#bp-temas button[aria-pressed="true"]')).toContainText("Todo");
});

test("la ficha de lectura abre, enlaza a la fuente y se cierra con Escape", async ({ page }) => {
  await page.goto("/blog");
  const boton = page.locator(".bp-fila h3 button").first();
  const titulo = (await boton.textContent())!.trim();
  await boton.click();
  const ficha = page.locator("dialog.bp-ficha");
  await expect(ficha).toHaveAttribute("open", "");
  await expect(ficha.locator("h2")).toHaveText(titulo);
  const enlace = ficha.getByRole("link", { name: /Leer en/ });
  await expect(enlace).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(ficha).not.toHaveAttribute("open", "");
  // Mientras se desvanece sigue mostrando la nota (antes quedaba un marco vacío).
  await expect(ficha.locator("h2")).toHaveText(titulo);
  // El foco vuelve a la fila desde la que se abrió.
  expect(await page.evaluate(() => document.activeElement?.closest(".bp-fila") !== null)).toBe(true);
});

test("la cápsula del clima se abre, pone a la materia a hacer de clima y cierra con Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  const pildora = page.getByRole("button", { name: /Abrir el detalle del tiempo|Tiempo en/ });
  await expect(pildora).toHaveAttribute("aria-expanded", "false");
  await pildora.click();
  const panel = page.getByRole("dialog", { name: "Tiempo y hora" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Viento", { exact: false })).toBeVisible();
  await expect(panel.getByText("Amanece", { exact: false })).toBeVisible();
  await expect(panel.getByLabel("Ciudad")).toBeVisible();
  const lienzo = page.locator("canvas#materia");
  await expect(lienzo).toHaveAttribute("data-forma-activa", "clima", { timeout: 12_000 });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(pildora).toBeFocused();
  await expect(lienzo).not.toHaveAttribute("data-forma-activa", "clima");
});

test("GitHub y Radar se dibujan sin errores aunque una fuente falle", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.goto("/blog");
  await expect(page.locator("#indice")).toBeVisible();
  if (await page.getByRole("heading", { name: "En lo que trabajo" }).count()) {
    await expect(page.locator("#github .bp-repos a").first()).toHaveAttribute("href", /github\.com/);
  }
  if (await page.getByRole("heading", { name: "Radar", exact: true }).count()) {
    await expect(page.locator("#radar .bp-aviso")).toContainText("no una recomendación");
  }
  // La página ya no es «solo oscuro»: sigue el tema elegido.
  await expect(page.locator(".viva.solo-oscuro")).toHaveCount(0);
  expect(errores).toEqual([]);
});

test("a 390 px el blog no desborda y las filas se apilan", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await expect(page.locator(".bp-fila").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const anchos = await page.locator(".bp-fila").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(anchos).size).toBe(1);
  // Nada se sale por la derecha (el desborde lo recorta la sección: se mide el borde de cada pieza).
  const derecha = await page.evaluate(() => Math.max(...[...document.querySelectorAll(".bp-fila, .bp-buscar, .bp-orden, .bp-temas, .bg-acc")].map((e) => e.getBoundingClientRect().right)));
  expect(derecha).toBeLessThanOrEqual(390);
});

test("a 390 px los titulares no se repiten: la cabecera no trae su lista corta y no baja las fotos del tambor oculto", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fotos: string[] = [];
  page.on("request", (r) => { if (r.resourceType() === "image" && /^https?:/.test(r.url()) && !r.url().includes("localhost")) fotos.push(r.url()); });
  await page.goto("/blog");
  await expect(page.locator(".bp-fila").first()).toBeVisible();
  await expect(page.locator(".bg-lista")).toHaveCount(0);
  await expect(page.locator(".bg-escena")).toBeHidden();
  await page.waitForTimeout(1500);
  const delTambor = await page.locator(".bg-foto img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  expect(fotos.filter((u) => delTambor.includes(u))).toEqual([]);
});

test("en la portada a 390 px sigue la lista corta de titulares", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const lista = page.locator("#blog .bg-lista");
  if (await page.locator("#blog .bg-vacio").count()) return; // sin titulares no hay lista
  await expect(lista).toHaveCount(1);
});

for (const [ancho, alto] of [[390, 844], [820, 1180], [1440, 900]] as const) {
  test(`el panel del clima cabe entero en la pantalla (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto("/blog");
    await page.locator(".cp-pildora").click();
    const caja = (await page.getByRole("dialog", { name: "Tiempo y hora" }).boundingBox())!;
    expect(caja.x).toBeGreaterThanOrEqual(0);
    expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
  });
}

test.describe("en el celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("apoyar el dedo para desplazar no cierra la cápsula del clima", async ({ page }) => {
    await page.goto("/blog");
    await page.locator(".cp-pildora").tap();
    const panel = page.getByRole("dialog", { name: "Tiempo y hora" });
    await expect(panel).toBeVisible();
    // El dedo se apoya fuera del panel y el navegador se queda con el gesto para desplazar.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 150 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await page.waitForTimeout(400);
    await expect(panel).toBeVisible();
  });
});

test("en tema claro se leen el cielo de la cápsula, las posturas del radar y los avisos", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("tema", "claro"); } catch { /* sin almacenamiento */ } });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  await page.locator(".cp-pildora").click();
  await expect(page.locator(".cp-ahora .it")).toBeVisible({ timeout: 12_000 });
  // Los avisos del radar aparecen al entrar en pantalla: se miden ya revelados.
  if (await page.locator("#radar").count()) {
    await page.locator("#radar .bp-aviso").scrollIntoViewIfNeeded();
    await expect(page.locator("#radar .bp-aviso")).toHaveCSS("opacity", "1");
  }
  const peores = await page.evaluate(() => {
    const color = (v: string): number[] => {
      v = v.trim();
      if (v.startsWith("#")) { const h = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join("") : v.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
      return (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    };
    const lum = (c: number[]) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const razon = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const mezcla = (c: number[], f: number[], op: number) => c.map((x, i) => x * op + f[i] * (1 - op));
    const fondo = color(getComputedStyle(document.documentElement).getPropertyValue("--fondo"));
    const panel = color(getComputedStyle(document.querySelector(".cp-panel")!).backgroundColor);
    // Dibujo (3:1): las piezas del ícono grande y el astro del arco, contra el panel.
    const piezas = [...document.querySelectorAll<SVGElement>(".cp-ahora .it *, .cp-astro")].map((e) => getComputedStyle(e))
      .flatMap((s) => [s.fill, s.stroke]).filter((v) => v && v !== "none" && !v.includes("url") && v !== "rgba(0, 0, 0, 0)");
    const dibujo = Math.min(...piezas.map((v) => razon(color(v), panel)));
    // Texto (4,5:1): la postura del radar y los avisos, con su opacidad.
    const texto = [...document.querySelectorAll<HTMLElement>(".bp-sujeto b, .bp-aviso, .cp-nota")].map((e) => {
      const s = getComputedStyle(e), sobre = e.closest(".cp-panel") ? panel : fondo;
      return razon(mezcla(color(s.color), sobre, Number(s.opacity)), sobre);
    });
    return { dibujo, texto: Math.min(...texto) };
  });
  expect(peores.dibujo, "contraste del cielo dibujado").toBeGreaterThanOrEqual(3);
  expect(peores.texto, "contraste de posturas y avisos").toBeGreaterThanOrEqual(4.5);
});

test("en el computador, la foto del frente abre la misma nota que su titular y no mueve el tambor", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // sin avance solo: el titular no cambia entre leerlo y hacer clic
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const enlace = page.locator('#blog .bg-linea[data-j="0"] h3 a');
  test.skip(!(await enlace.count()), "sin titulares con enlace");
  const titulo = (await enlace.textContent()) ?? "";
  const href = new URL((await enlace.getAttribute("href")) ?? "").href;
  await context.route((u) => u.href === href, (r) => r.fulfill({ body: "nota" })); // no sale a internet
  const foto = page.locator('#blog .bg-foto[data-j="0"]');
  await page.locator("#bg-escena").evaluate((e) => e.scrollIntoView({ block: "center" }));
  // Toda la foto lleva a la nota: las vecinas, invisibles, no atajan el clic en ninguna parte.
  const huecos = await foto.evaluate((f) => {
    const q = f.getBoundingClientRect(), fuera: string[] = [];
    for (let i = 1; i < 10; i++) for (let k = 1; k < 10; k++) {
      const el = document.elementFromPoint(q.left + (q.width * i) / 10, q.top + (q.height * k) / 10);
      if (!el?.closest('.bg-foto[data-j="0"] a')) fuera.push(`${i},${k}`);
    }
    return fuera;
  });
  expect(huecos).toEqual([]);
  const caja = (await foto.boundingBox())!;
  const [nota] = await Promise.all([page.waitForEvent("popup"), page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height * 0.85)]);
  expect(nota.url()).toBe(href);
  await expect(page.locator('#blog .bg-linea[data-j="0"] h3')).toHaveText(titulo);
});

test("si la foto de un titular no llega, el marco muestra el medio en vez de quedar vacío", async ({ page }) => {
  // Ninguna foto de afuera llega (bloqueo, red lenta o un medio que la quitó).
  await page.route("**/*", (r) => (r.request().resourceType() === "image" && !r.request().url().startsWith(new URL(page.url() || "http://x").origin) ? r.abort() : r.continue()));
  await page.goto("/blog");
  const actual = page.locator('.bg-foto[data-j="0"]');
  await expect(actual.locator(".bg-placa")).toBeVisible();
  await expect(actual.locator(".bg-placa b")).not.toBeEmpty();
  // Y sin el ícono de imagen rota encima (la foto que falla se oculta, aunque falle antes de hidratar).
  await expect(actual.locator("img")).toHaveAttribute("data-rota", "");
  // Las vecinas se piden de inmediato: al llegarles el turno ya están (o ya fallaron).
  for (const j of ["0", "1", "-1"]) await expect(page.locator(`.bg-foto[data-j="${j}"] img`)).toHaveAttribute("loading", "eager");
});
