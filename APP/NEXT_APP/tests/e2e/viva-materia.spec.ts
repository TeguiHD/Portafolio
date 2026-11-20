import { expect, test, type Page } from "@playwright/test";

/**
 * El motor se prueba en /materia-prueba: una página de diagnóstico que solo existe fuera de
 * producción, con una sección por forma. Así el motor se verifica antes de que exista la portada nueva.
 */
const RUTA = "/materia-prueba";
/** Reposo y rendimiento se miden en la portada real, que también existe en una compilación de producción. */
const REAL = "/";
const lienzo = (page: Page) => page.locator("canvas#materia");

async function alCentro(page: Page, id: string) {
    await page.evaluate((i) => {
        document.documentElement.style.scrollBehavior = "auto";
        const e = document.getElementById(i)!;
        const r = e.getBoundingClientRect();
        scrollTo(0, r.top + scrollY - (innerHeight - r.height) / 2);
    }, id);
}

/** Cuántas veces se limpia el lienzo (= cuadros pintados) durante `ms`. */
function cuadrosPintados(page: Page, ms: number) {
    return page.evaluate((espera) => new Promise<number>((listo) => {
        const original = CanvasRenderingContext2D.prototype.clearRect; let n = 0;
        CanvasRenderingContext2D.prototype.clearRect = function (...a) { n++; return original.apply(this, a); };
        setTimeout(() => { CanvasRenderingContext2D.prototype.clearRect = original; listo(n); }, espera);
    }), ms);
}

/** El motor queda a mano en `window.__materia` (lo publica Materia.tsx). */
function ponerClima(page: Page, tipo: string | null) {
    return page.evaluate((t) => (window as unknown as { __materia: { clima(x: string | null): void } }).__materia.clima(t), tipo);
}

test.describe("Materia viva: motor de partículas", () => {
    // Las pruebas que recorren la página de diagnóstico se saltan contra una compilación de producción, donde no existe.
    test.beforeEach(async ({ request }, info) => {
        if (!/sigue a la sección|sin ancla|avance de lectura/.test(info.title)) return;
        test.skip((await request.get(RUTA)).status() === 404, "sin página de diagnóstico (compilación de producción)");
    });

    test("la materia sigue a la sección que está al centro", async ({ page }) => {
        await page.goto(RUTA);
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "figuras");
        await alCentro(page, "p-firma");
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "firma");
        await alCentro(page, "p-olas");
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "olas");
    });

    test("una sección sin ancla para su forma cae en una forma que no la necesita", async ({ page }) => {
        await page.goto(RUTA);
        await alCentro(page, "p-imagen-sin-foto"); // pide «imagen», pero nadie cargó una
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "marco");
    });

    test("publica el avance de lectura", async ({ page }) => {
        await page.goto(RUTA);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--avance")))).toBeGreaterThan(0.95);
    });

    test("con menos movimiento no hay bucle de animación", async ({ browser }) => {
        const contexto = await browser.newContext({ reducedMotion: "reduce" });
        const page = await contexto.newPage();
        await page.goto(REAL);
        await expect(lienzo(page)).toHaveAttribute("data-quieto", "true");
        const cuadros = await page.evaluate(() => new Promise<number>((listo) => {
            const dibujar = CanvasRenderingContext2D.prototype.clearRect; let n = 0;
            CanvasRenderingContext2D.prototype.clearRect = function (...a) { n++; return dibujar.apply(this, a); };
            setTimeout(() => listo(n), 1200);
        }));
        expect(cuadros).toBeLessThanOrEqual(2); // no redibuja si nada cambia
        await contexto.close();
    });

    test("el bucle no se atrasa con el cursor rápido", async ({ page }) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.addInitScript(() => {
            const w = window as unknown as { __js: number[] }; w.__js = [];
            const raf = window.requestAnimationFrame.bind(window);
            window.requestAnimationFrame = (f) => raf((t) => { const a = performance.now(); f(t); w.__js.push(performance.now() - a); });
        });
        await page.goto(REAL);
        await page.waitForTimeout(1500);
        const fin = Date.now() + 4000; let k = 0;
        while (Date.now() < fin) { k++; await page.mouse.move(640 + 420 * Math.sin(k * 0.9), 360 + 240 * Math.cos(k * 1.3), { steps: 6 }); }
        const ms = await page.evaluate(() => (window as unknown as { __js: number[] }).__js.slice(-300).sort((a, b) => a - b));
        expect(ms.length).toBeGreaterThan(30);
        expect(ms[Math.floor(ms.length / 2)], "mediana del trabajo por cuadro, con la CPU a un cuarto").toBeLessThan(6);
    });

    test("con la forma armada y nada moviéndose, deja de pintar hasta que algo cambia", async ({ page }) => {
        await page.goto(REAL);
        await alCentro(page, "firma");
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "firma");
        await page.waitForTimeout(3500); // se arma y se aquieta
        expect(await cuadrosPintados(page, 1000), "cuadros pintados en 1 s de reposo").toBeLessThanOrEqual(2);
        await page.mouse.move(400, 300); await page.mouse.move(460, 340, { steps: 4 });
        expect(await cuadrosPintados(page, 500), "el cursor la despierta").toBeGreaterThan(5);
    });

    test.describe("en el celular", () => {
        test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        test("un toque sacude la materia; apoyar el dedo para desplazar, no", async ({ page }) => {
            await page.goto(REAL);
            await alCentro(page, "firma");
            await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "firma");
            await page.waitForTimeout(3500);
            const cdp = await page.context().newCDPSession(page);
            // El dedo se apoya y el navegador se queda con el gesto (pointercancel): la materia no reacciona.
            const apoyar = cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 420 }] })
                .then(() => cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }));
            const [apoyado] = await Promise.all([cuadrosPintados(page, 800), apoyar]);
            expect(apoyado, "apoyar el dedo no la despierta").toBeLessThanOrEqual(2);
            const [tocado] = await Promise.all([cuadrosPintados(page, 500), page.touchscreen.tap(195, 420)]);
            expect(tocado, "un toque la sacude").toBeGreaterThan(5);
        });
    });

    test("el clima manda mientras está puesto y al quitarlo vuelve la forma de la sección", async ({ page }) => {
        await page.goto(REAL);
        await alCentro(page, "firma");
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "firma");
        await ponerClima(page, "lluvia");
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "clima");
        await expect(lienzo(page)).toHaveAttribute("data-clima", "lluvia");
        await alCentro(page, "contacto"); // desplazarse no le quita el mando
        await page.waitForTimeout(400);
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "clima");
        await ponerClima(page, null);
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "anillo");
        await expect(lienzo(page)).not.toHaveAttribute("data-clima", /.*/);
    });

    test("con menos movimiento el clima se pinta una sola vez", async ({ browser }) => {
        const contexto = await browser.newContext({ reducedMotion: "reduce" });
        const page = await contexto.newPage();
        await page.goto(REAL);
        await page.waitForTimeout(800);
        const [cuadros] = await Promise.all([cuadrosPintados(page, 1200), ponerClima(page, "noche")]);
        await expect(lienzo(page)).toHaveAttribute("data-forma-activa", "clima");
        expect(cuadros).toBeLessThanOrEqual(2);
        await contexto.close();
    });

    test("si los cuadros se atrasan, baja las partículas", async ({ page }) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
        await page.goto(REAL);
        await expect.poll(async () => {
            const d = await lienzo(page).evaluate((c: HTMLCanvasElement) => ({ a: Number(c.dataset.activas), t: Number(c.dataset.total) }));
            return d.t > 0 && d.a < d.t;
        }, { timeout: 20_000 }).toBe(true);
    });
});
