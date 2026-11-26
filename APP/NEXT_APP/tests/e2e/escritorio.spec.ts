import { expect, test, type Page } from "@playwright/test";

/**
 * Modo escritorio (/escritorio): el sitio como un escritorio con ventanas. Pedido del dueño el 26-11-2026, inspirado en el
 * escritorio de bait.cl pero hecho con la identidad propia (materia de partículas, clics sintetizados, marca «n.»).
 * Las ventanas muestran las páginas reales del sitio en un iframe del mismo origen, sin la barra ni el pie.
 */
async function entrar(page: Page, ruta = "/escritorio") {
    // Sin el encendido de la primera visita: las pruebas entran directo al escritorio.
    await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); } catch { /* sin almacenamiento */ } });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ruta);
    await expect(page.getByRole("listbox", { name: "Íconos del escritorio" })).toBeVisible();
}
const ventana = (page: Page, nombre: string | RegExp) => page.getByRole("dialog", { name: nombre });
const ventanaDe = (page: Page, id: string) => page.locator(`.es-ventana[data-app="${id}"]`);

test.describe("modo escritorio", () => {
    test("la página no se indexa y muestra los íconos", async ({ page }) => {
        await entrar(page);
        await expect(page).toHaveTitle(/Modo escritorio/);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        await expect(page.getByRole("listbox", { name: "Íconos del escritorio" }).getByRole("option"))
            .toHaveText(["Proyectos", "Servicios", "Herramientas", "Sobre mí", "Blog", "Índice de la Web Chilena", "Conversemos"]);
    });

    test("doble clic abre una ventana y la herramienta carga sin la barra ni el pie del sitio", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Herramientas" }).dblclick();
        const carpeta = ventana(page, "Herramientas");
        await expect(carpeta).toBeVisible();
        await carpeta.locator('[data-abrir="herramientas/qr"]').click();
        const qr = ventanaDe(page, "herramientas/qr");
        await expect(qr).toBeVisible();
        const marco = qr.locator("iframe");
        await expect(marco).toHaveAttribute("src", "/herramientas/qr");
        const dentro = marco.contentFrame();
        await expect(dentro.locator("h1")).toContainText("QR");
        await expect(dentro.locator("html")).toHaveAttribute("data-ventana", "");
        await expect(dentro.locator(".nb")).toBeHidden();
        await expect(dentro.locator(".suelo")).toBeHidden();
    });

    test("se minimiza, vuelve desde la barra de tareas y se cierra", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const v = ventana(page, "Proyectos");
        await expect(v).toBeVisible();
        await v.getByRole("button", { name: "Minimizar" }).click();
        await expect(v).toBeHidden();
        await page.getByRole("navigation", { name: "Barra de tareas" }).getByRole("button", { name: "Proyectos" }).click();
        await expect(v).toBeVisible();
        await v.getByRole("button", { name: "Cerrar" }).click();
        await expect(v).toHaveCount(0);
    });

    test("se arrastra por el título y se encaja en el borde", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const v = ventana(page, "Proyectos");
        await expect(v).toBeVisible();
        await expect(v).not.toHaveAttribute("data-naciendo", "");
        // La ventana termina de armarse (animación de entrada) antes de medirla.
        await expect.poll(() => v.evaluate((el) => el.getAnimations().length)).toBe(0);
        const titulo = v.locator(".es-cab");
        const a = (await v.boundingBox())!, t = (await titulo.boundingBox())!;
        const sx = t.x + t.width / 2, sy = t.y + t.height / 2;
        await page.mouse.move(sx, sy); await page.mouse.down();
        await page.mouse.move(sx + 60, sy + 30, { steps: 4 }); await page.mouse.move(sx + 120, sy + 60, { steps: 4 });
        await page.mouse.up();
        await expect.poll(async () => { const b = (await v.boundingBox())!; return [Math.round(b.x - a.x), Math.round(b.y - a.y)]; }).toEqual([120, 60]);

        const t2 = (await titulo.boundingBox())!;
        await page.mouse.move(t2.x + t2.width / 2, t2.y + t2.height / 2); await page.mouse.down();
        await page.mouse.move(300, 300, { steps: 5 }); await page.mouse.move(0, 300, { steps: 5 });
        await page.mouse.up();
        await expect.poll(async () => { const b = (await v.boundingBox())!; return b.x <= 12 && Math.abs(b.width - 706) <= 6; }).toBe(true);
    });

    test("maximizada, sacada y vuelta a soltar arriba queda maximizada de verdad", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const v = ventana(page, "Proyectos");
        await expect(v).not.toHaveAttribute("data-naciendo", "");
        await expect.poll(() => v.evaluate((el) => el.getAnimations().length)).toBe(0);
        await v.locator(".es-tit").dblclick();
        await expect(v).toHaveAttribute("data-zona", "max");
        await expect.poll(async () => (await v.boundingBox())!.width).toBeGreaterThan(1400);
        const t = (await v.locator(".es-tit").boundingBox())!;
        await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2); await page.mouse.down();
        await page.mouse.move(700, 300, { steps: 6 }); await page.mouse.move(700, 0, { steps: 6 });
        await page.mouse.up();
        await expect(v).toHaveAttribute("data-zona", "max");
        await expect.poll(async () => (await v.boundingBox())!.width).toBeGreaterThan(1400);
    });

    test("estirar el borde de arriba no saca el título de la pantalla", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const v = ventana(page, "Proyectos");
        await expect(v).not.toHaveAttribute("data-naciendo", "");
        await expect.poll(() => v.evaluate((el) => el.getAnimations().length)).toBe(0);
        const b = (await v.locator('.es-borde[data-b="n"]').boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y - 400, { steps: 6 }); await page.mouse.move(b.x + b.width / 2, -50, { steps: 4 });
        await page.mouse.up();
        const r = (await v.boundingBox())!;
        expect(r.y).toBeGreaterThanOrEqual(9);
        expect(r.y + r.height).toBeLessThanOrEqual(900 - 84 + 1);
    });

    test("un clic dentro de una ventana cierra el inicio abierto", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=sobre-mi");
        const dentro = ventana(page, "Sobre mí").locator("iframe").contentFrame();
        await expect(dentro.locator("html")).toHaveAttribute("data-ventana", "");
        await page.getByRole("button", { name: "Inicio" }).click();
        await expect(page.getByRole("searchbox", { name: "Buscar en el escritorio" })).toBeVisible();
        await dentro.locator("h1").click();
        await expect(page.getByRole("searchbox", { name: "Buscar en el escritorio" })).toBeHidden();
    });

    test("una preferencia de sonido dañada no deja el escritorio mudo", async ({ page }) => {
        await page.addInitScript(() => {
            try { localStorage.setItem("escritorio:sonido", JSON.stringify({ tipo: "toString", volumen: 7, activo: "si" })); } catch { /* sin almacenamiento */ }
            const w = window as unknown as { __clics: number };
            w.__clics = 0;
            const original = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: Parameters<typeof original>) {
                if (!(this.context instanceof OfflineAudioContext)) w.__clics++;
                return original.apply(this, a);
            };
        });
        await entrar(page);
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        await page.mouse.click(760, 460);
        await expect.poll(() => page.evaluate(() => (window as unknown as { __clics: number }).__clics)).toBeGreaterThanOrEqual(2);
    });

    test("con el teclado: Enter abre un ícono y Ctrl K busca una herramienta", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Sobre mí" }).focus();
        await page.keyboard.press("Enter");
        await expect(ventana(page, "Sobre mí")).toBeVisible();
        await page.keyboard.press("Control+k");
        const buscar = page.getByRole("searchbox", { name: "Buscar en el escritorio" });
        await expect(buscar).toBeFocused();
        await buscar.fill("json");
        await page.keyboard.press("Enter");
        await expect(ventanaDe(page, "herramientas/json")).toBeVisible();
    });

    test("el clic suena al presionar y al soltar, y se puede apagar", async ({ page }) => {
        await page.addInitScript(() => {
            const w = window as unknown as { __clics: number };
            w.__clics = 0;
            const original = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: Parameters<typeof original>) {
                if (!(this.context instanceof OfflineAudioContext)) w.__clics++;
                return original.apply(this, a);
            };
        });
        await entrar(page);
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        const clics = () => page.evaluate(() => (window as unknown as { __clics: number }).__clics);
        await page.mouse.click(760, 460);
        await expect.poll(clics).toBeGreaterThanOrEqual(2);
        await page.getByRole("button", { name: "Sonido", exact: true }).click();
        await page.getByLabel("Sonido activado").uncheck();
        await page.keyboard.press("Escape");
        const antes = await clics();
        await page.mouse.click(760, 460);
        await page.waitForTimeout(300);
        expect(await clics()).toBe(antes);
    });

    test("el tema cambia también dentro de las ventanas", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Sobre mí" }).dblclick();
        const dentro = ventana(page, "Sobre mí").locator("iframe").contentFrame();
        await expect(dentro.locator("html")).toHaveAttribute("data-ventana", "");
        const antes = await page.locator("html").getAttribute("data-tema");
        const despues = antes === "claro" ? "oscuro" : "claro";
        await page.getByRole("button", { name: "Cambiar entre tema claro y oscuro" }).click();
        await expect(page.locator("html")).toHaveAttribute("data-tema", despues);
        await expect(dentro.locator("html")).toHaveAttribute("data-tema", despues);
    });

    test("un enlace dentro de una ventana abre su propia ventana", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=herramientas/qr");
        const qr = ventanaDe(page, "herramientas/qr");
        const dentro = qr.locator("iframe").contentFrame();
        const enlace = dentro.locator('a[href="/herramientas/enlaces"]').first();
        await enlace.scrollIntoViewIfNeeded();
        await enlace.click();
        await expect(ventanaDe(page, "herramientas/enlaces")).toBeVisible();
        expect(await qr.locator("iframe").evaluate((f: HTMLIFrameElement) => f.contentWindow!.location.pathname)).toBe("/herramientas/qr");
    });

    test("clic derecho en el fondo abre el menú del escritorio", async ({ page }) => {
        await entrar(page);
        await page.mouse.click(900, 520, { button: "right" });
        const menu = page.getByRole("menu", { name: "Menú del escritorio" });
        await expect(menu).toBeVisible();
        await menu.getByRole("menuitemradio", { name: "Quieto" }).click();
        await expect(menu).toBeHidden();
        await page.mouse.click(900, 520, { button: "right" });
        await expect(menu.getByRole("menuitemradio", { name: "Quieto" })).toHaveAttribute("aria-checked", "true");
    });

    test("Conversemos abre el formulario de contacto real", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Conversemos" }).dblclick();
        const dentro = ventana(page, "Conversemos").locator("iframe").contentFrame();
        await expect(dentro.getByRole("heading", { name: /Conversemos/ })).toBeVisible();
        // La página de la ventana se pinta antes de hidratarse (en producción los scripts llegan por Cloudflare): se
        // reintenta el clic hasta que el botón ya responde.
        await expect(async () => {
            await dentro.getByRole("button", { name: "Escribirme un mensaje" }).click();
            await expect(dentro.getByRole("dialog", { name: "Escríbeme" })).toBeVisible({ timeout: 1500 });
        }).toPass({ timeout: 20000 });
    });

    test("en el celular las ventanas ocupan la pantalla y Atrás las cierra", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); } catch { /* sin almacenamiento */ } });
        await page.goto("/escritorio");
        await page.getByRole("option", { name: "Proyectos" }).tap();
        const v = ventana(page, "Proyectos");
        await expect(v).toBeVisible();
        expect((await v.boundingBox())!.width).toBeGreaterThanOrEqual(388);
        await page.goBack();
        await expect(v).toHaveCount(0);
        await expect(page).toHaveURL(/\/escritorio$/);
        // Dos ventanas: cada Atrás cierra la que abrió ese paso, aunque entremedio se haya cambiado de ventana.
        await page.getByRole("option", { name: "Proyectos" }).tap();
        await expect(ventana(page, "Proyectos")).toBeVisible();
        await page.getByRole("navigation", { name: "Barra de tareas" }).getByRole("button", { name: "Herramientas" }).tap();
        await expect(ventana(page, "Herramientas")).toBeVisible();
        await page.getByRole("navigation", { name: "Barra de tareas" }).getByRole("button", { name: "Proyectos" }).tap();
        await page.goBack();
        await expect(ventana(page, "Herramientas")).toHaveCount(0);
        await expect(ventana(page, "Proyectos")).toHaveCount(1);
        await page.goBack();
        await expect(ventana(page, "Proyectos")).toHaveCount(0);
        await expect(page).toHaveURL(/\/escritorio$/);
        await ctx.close();
    });
});

test.describe("modo escritorio: el resto del sitio", () => {
    test("las páginas públicas se dejan enmarcar solo por el mismo sitio; el acceso no", async ({ request }) => {
        const publica = await request.get("/herramientas/qr");
        expect(publica.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
        expect(publica.headers()["x-frame-options"]).toBe("SAMEORIGIN");
        const privada = await request.get("/acceso"), csp = privada.headers()["content-security-policy"] ?? "";
        // El servidor local de pruebas abre la CSP a 'self' en todo (proxy.ts, isDev); ahí manda el encabezado, que sigue en DENY.
        if (csp.includes("http://localhost:*")) expect(privada.headers()["x-frame-options"]).toBe("DENY");
        else expect(csp).toContain("frame-ancestors 'none'");
    });

    test("la barra y el pie del sitio llevan al modo escritorio", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/sobre-mi");
        await expect(page.locator(".nb").getByRole("link", { name: "Modo escritorio" })).toHaveAttribute("href", "/escritorio");
        await expect(page.locator(".suelo").getByRole("link", { name: "Modo escritorio" })).toHaveAttribute("href", "/escritorio");
    });

    test("desde 1100 px el ícono cabe en la barra sin empujar «Hablemos»; más angosto se esconde", async ({ page }) => {
        for (const [ancho, visible] of [[1100, true], [1099, false]] as const) {
            await page.setViewportSize({ width: ancho, height: 900 });
            await page.goto("/herramientas");
            await page.waitForFunction(() => document.getElementById("nb")!.getAnimations({ subtree: true }).every((a) => a.playState !== "running"));
            await expect(page.locator(".nb-escritorio")).toBeVisible({ visible });
            expect(await page.evaluate(() => document.querySelector("#nb-hablar")!.getBoundingClientRect().right <= document.querySelector("#nb")!.getBoundingClientRect().right + 0.5), `${ancho}`).toBe(true);
        }
    });

    test("la página de contacto existe sola y no compite con la portada", async ({ page }) => {
        const r = await page.goto("/contacto");
        expect(r?.status()).toBe(200);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        await expect(page.getByRole("heading", { name: /Conversemos/ })).toBeVisible();
    });
});
