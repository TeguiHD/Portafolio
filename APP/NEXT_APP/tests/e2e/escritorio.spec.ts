import { expect, test, type Page } from "@playwright/test";

/**
 * Modo escritorio (/escritorio), versión 2: un Windows 11 con la marca «n.» (pedido del dueño el 26-11-2026). Barra de
 * tareas, inicio, ventanas con acople, Explorador, Fotos, Correo, Noticias, Widgets y Configuración; las herramientas
 * como apps (/escritorio/app/<slug>) y las páginas del sitio en el Lector.
 */
async function entrar(page: Page, ruta = "/escritorio", { bloqueo = false } = {}) {
    // Sin el encendido ni la bienvenida de la primera visita; sin la pantalla de bloqueo, salvo que la prueba la quiera.
    await page.addInitScript((b) => {
        try {
            localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1");
            if (!b && !sessionStorage.getItem("escritorio:probando")) { sessionStorage.setItem("escritorio:dentro", "1"); sessionStorage.setItem("escritorio:probando", "1"); }
        } catch { /* sin almacenamiento */ }
    }, bloqueo);
    if (!page.viewportSize() || page.viewportSize()!.width !== 1440) await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ruta);
    await expect(page.getByRole("listbox", { name: "Íconos del escritorio" })).toBeVisible();
}
const ventana = (page: Page, nombre: string | RegExp) => page.getByRole("dialog", { name: nombre });
const ventanaDe = (page: Page, id: string) => page.locator(`.es-ventana[data-app="${id}"]`);
const barra = (page: Page) => page.getByRole("navigation", { name: "Barra de tareas" });
/** Espera a que la ventana termine de aparecer (entra creciendo un poco, como en Windows 11). */
const quieta = (v: ReturnType<typeof ventanaDe>) => v.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

// El service worker del sitio atiende los pedidos de las páginas ya controladas y se saltaría page.route.
test.use({ serviceWorkers: "block" });

test.describe("modo escritorio", () => {
    test("no se indexa y muestra los íconos y la barra de tareas de Windows", async ({ page }) => {
        await entrar(page);
        await expect(page).toHaveTitle(/Modo escritorio/);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        const iconos = page.getByRole("listbox", { name: "Íconos del escritorio" }).getByRole("option");
        await expect(iconos).toHaveCount(10);
        await expect(iconos.nth(0)).toHaveText("Proyectos");
        await expect(iconos.nth(5)).toHaveText("Correo");
        for (const nombre of ["Inicio", "Buscar", "Explorador de archivos", "Herramientas", "Correo", "Noticias"]) {
            await expect(barra(page).getByRole("button", { name: nombre, exact: true })).toBeVisible();
        }
        await expect(barra(page).locator(".es-reloj")).toContainText(/\d{2}:\d{2}/);
    });

    test("la primera vez de la sesión aparece la pantalla de bloqueo y una tecla la sube", async ({ page }) => {
        await entrar(page, "/escritorio", { bloqueo: true });
        const bloqueo = page.getByRole("dialog", { name: /Pantalla de bloqueo/ });
        await expect(bloqueo).toBeVisible();
        await expect(bloqueo).toContainText(/\d{2}:\d{2}/);
        await page.waitForTimeout(450);
        await page.keyboard.press("Enter");
        await expect(bloqueo).toHaveCount(0);
        await page.reload();
        await expect(page.getByRole("listbox", { name: "Íconos del escritorio" })).toBeVisible();
        await expect(page.getByRole("dialog", { name: /Pantalla de bloqueo/ })).toHaveCount(0);
    });

    test("el inicio: anclado, todas las apps y el buscador abren una herramienta como app", async ({ page }) => {
        await entrar(page);
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        const inicio = page.getByRole("dialog", { name: "Inicio" });
        await expect(inicio.getByRole("heading", { name: "Anclado" })).toBeVisible();
        await inicio.getByRole("button", { name: /Todas las apps/ }).click();
        await expect(inicio.getByRole("heading", { name: "Todas las apps" })).toBeVisible();
        await inicio.getByRole("searchbox", { name: "Buscar en el escritorio" }).fill("sueldo");
        await expect(inicio.getByRole("heading", { name: "Mejor coincidencia" })).toBeVisible();
        await page.keyboard.press("Enter");
        const app = ventanaDe(page, "herramientas/sueldo-liquido");
        await expect(app).toBeVisible();
        await expect(app.locator("iframe")).toHaveAttribute("src", "/escritorio/app/sueldo-liquido");
        await expect(inicio).toBeHidden();
    });

    test("la herramienta abre como app: sin la página alrededor y sin la dirección en la ventana", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Generador de QR" }).dblclick();
        const qr = ventanaDe(page, "herramientas/qr");
        await expect(qr).toBeVisible();
        await expect(qr.locator("header").first()).toContainText("Generador de QR");
        await expect(qr.locator("header").first()).not.toContainText("nicoholas.dev/");
        const marco = qr.locator("iframe");
        await expect(marco).toHaveAttribute("src", "/escritorio/app/qr");
        const dentro = marco.contentFrame();
        await expect(dentro.getByText("Tu código QR")).toBeVisible();
        await expect(dentro.locator(".tool-page-heading")).toBeHidden();
        await expect(dentro.getByRole("heading", { name: /Preguntas frecuentes/i })).toHaveCount(0);
        await expect(dentro.locator('nav[aria-label="Ruta de navegación"]')).toHaveCount(0);
        await expect(dentro.locator("html")).toHaveAttribute("data-ventana", "");
    });

    test("dentro de la app se escribe y la herramienta responde", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=herramientas/base64");
        const app = ventanaDe(page, "herramientas/base64");
        await expect(app).toBeVisible();
        const dentro = app.locator("iframe").contentFrame();
        // En producción la página de la herramienta puede terminar de hidratarse después de que se escribe: si lo escrito
        // llegó antes que React, se vuelve a escribir (como hace una persona que ve que no pasó nada).
        await expect(async () => {
            await dentro.getByRole("textbox", { name: "Entrada", exact: true }).fill("");
            await dentro.getByRole("textbox", { name: "Entrada", exact: true }).fill("hola");
            await expect(dentro.getByRole("textbox", { name: "Resultado" })).toHaveValue("aG9sYQ==", { timeout: 2000 });
        }).toPass({ timeout: 20000 });
    });

    test("la ruta de app solo existe para herramientas públicas y fuera de una ventana lleva a la herramienta", async ({ page, request }) => {
        expect((await request.get("/escritorio/app/no-existe")).status()).toBe(404);
        const r = await request.get("/escritorio/app/qr");
        expect(r.status()).toBe(200);
        expect(r.headers()["content-security-policy"]).toMatch(/frame-ancestors 'self'|localhost/);
        expect(await r.text()).toMatch(/<meta name="robots" content="noindex/);
        await page.goto("/escritorio/app/qr");
        await expect(page).toHaveURL(/\/herramientas\/qr$/);
    });

    test("el Explorador recorre Proyectos hasta una captura que se abre en Fotos", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const ex = ventanaDe(page, "proyectos");
        await expect(ex).toBeVisible();
        const lista = ex.getByRole("listbox", { name: "Proyectos" });
        await expect(lista.getByRole("option")).toHaveCount(3);
        await lista.getByRole("option").first().dblclick();
        const portada = ex.getByRole("option", { name: "Portada.jpg" });
        await expect(portada).toBeVisible();
        await expect(ex.getByRole("navigation", { name: "Dirección" })).toContainText("Proyectos");
        await portada.dblclick();
        const fotos = ventanaDe(page, "fotos");
        await expect(fotos).toBeVisible();
        await expect(fotos.locator(".fo-lienzo img")).toBeVisible();
        await expect(fotos).toContainText("1 de");
        await fotos.getByRole("button", { name: "Foto siguiente" }).click();
        await expect(fotos).toContainText("2 de");
        await fotos.getByRole("button", { name: "Cerrar" }).click();
        await ex.getByRole("button", { name: "Atrás" }).click();
        await expect(lista.getByRole("option")).toHaveCount(3);
    });

    test("se minimiza, vuelve desde la barra de tareas y se cierra", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const v = ventanaDe(page, "correo");
        await expect(v).toBeVisible();
        await v.getByRole("button", { name: "Minimizar" }).click();
        await expect(v).toBeHidden();
        await barra(page).getByRole("button", { name: "Correo", exact: true }).click();
        await expect(v).toBeVisible();
        await v.getByRole("button", { name: "Cerrar" }).click();
        await expect(v).toHaveCount(0);
    });

    test("al pasar por maximizar aparecen los diseños de acople y uno acopla la ventana", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const v = ventanaDe(page, "correo");
        await expect(v).toBeVisible();
        await quieta(v);
        await v.getByRole("button", { name: "Maximizar" }).hover();
        const acople = page.getByRole("group", { name: "Diseños de acople" });
        await expect(acople).toBeVisible();
        await acople.getByRole("button", { name: "Acoplar en la mitad izquierda" }).click();
        await expect(v).toHaveAttribute("data-zona", "izq");
        await expect.poll(async () => (await v.boundingBox())?.width).toBeCloseTo(720, -1);
        await expect.poll(async () => (await v.boundingBox())?.x).toBeCloseTo(0, -1);
    });

    test("arrastrada a la esquina de arriba a la izquierda queda en un cuarto", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const v = ventanaDe(page, "correo");
        await expect(v).toBeVisible();
        await quieta(v);
        const t = (await v.locator(".es-tit").boundingBox())!;
        await page.mouse.move(t.x + 40, t.y + 10);
        await page.mouse.down();
        await page.mouse.move(300, 200, { steps: 6 });
        await page.mouse.move(1, 8, { steps: 6 });
        await page.mouse.up();
        await expect(v).toHaveAttribute("data-zona", "si");
        await expect.poll(async () => { const b = await v.boundingBox(); return b ? [Math.round(b.width), Math.round(b.height)] : null; }).toEqual([720, 426]);
    });

    test("Configuración: el fondo y la barra a la izquierda se guardan", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=configuracion");
        const cf = ventanaDe(page, "configuracion");
        await cf.getByRole("radio", { name: "Pacífico" }).click();
        await expect.poll(() => page.locator(".es > .es-fondo img").evaluate((i: HTMLImageElement) => i.currentSrc)).toContain("pacifico");
        await cf.getByRole("combobox", { name: "Alineación de la barra de tareas" }).selectOption("izq");
        await expect(barra(page)).toHaveAttribute("data-alinear", "izq");
        await page.reload();
        await expect(barra(page)).toHaveAttribute("data-alinear", "izq");
        await expect.poll(() => page.locator(".es > .es-fondo img").evaluate((i: HTMLImageElement) => i.currentSrc)).toContain("pacifico");
    });

    test("el clic suena al presionar y al soltar, y se apaga desde la configuración rápida", async ({ page }) => {
        await page.addInitScript(() => {
            const w = window as unknown as { __clics: number };
            w.__clics = 0;
            const original = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: Parameters<typeof original>) { w.__clics++; return original.apply(this, a); };
        });
        await entrar(page);
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        const clics = () => page.evaluate(() => (window as unknown as { __clics: number }).__clics);
        await page.mouse.click(900, 420);
        await expect.poll(clics).toBeGreaterThanOrEqual(2);
        await barra(page).getByRole("button", { name: /Configuración rápida/ }).click();
        const rapida = page.getByRole("dialog", { name: "Configuración rápida" });
        await rapida.getByRole("button", { name: "Sonido" }).click();
        await expect(rapida.getByRole("button", { name: "Sonido" })).toHaveAttribute("aria-pressed", "false");
        await page.keyboard.press("Escape");
        const antes = await clics();
        await page.mouse.click(900, 420);
        await page.waitForTimeout(300);
        expect(await clics()).toBe(antes);
        await page.reload();
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        await page.mouse.click(900, 420);
        await page.waitForTimeout(300);
        expect(await clics()).toBe(0);
    });

    test("la hora abre las notificaciones y el calendario del mes", async ({ page }) => {
        await entrar(page);
        await barra(page).locator(".es-reloj").click();
        const panel = page.getByRole("dialog", { name: "Notificaciones y calendario" });
        await expect(panel).toBeVisible();
        await expect(panel.locator('td[aria-current="date"]')).toHaveCount(1);
        await expect(panel.getByText("Sin notificaciones nuevas")).toBeVisible();
    });

    test("Correo valida el mensaje corto y, al enviar, avisa con una notificación", async ({ page }) => {
        let cuerpo: Record<string, unknown> | null = null;
        // Nunca se envía de verdad: el servidor se reemplaza aquí.
        await page.route("**/api/contact", (r) => { cuerpo = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }); });
        await entrar(page, "/escritorio?abrir=correo");
        const co = ventanaDe(page, "correo");
        await co.getByRole("textbox", { name: "Tu correo" }).fill("persona@ejemplo.cl");
        await co.getByRole("textbox", { name: "Mensaje" }).fill("hola");
        await co.getByRole("button", { name: "Enviar" }).click();
        await expect(co.getByRole("alert")).toContainText("al menos 10 caracteres");
        await co.getByRole("textbox", { name: "Mensaje" }).fill("Hola, quiero una tienda en línea para mi pyme.");
        await co.getByRole("button", { name: "Enviar" }).click();
        await expect(co.getByRole("heading", { name: "Mensaje enviado" })).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".es-toast").getByText("Mensaje enviado")).toBeVisible();
        expect(cuerpo).toMatchObject({ email: "persona@ejemplo.cl", website: "" });
        expect(typeof (cuerpo as unknown as { formStartTime: unknown }).formStartTime).toBe("number");
    });

    test("Noticias y Widgets con las fuentes caídas lo dicen y ofrecen reintentar", async ({ page }) => {
        await page.route("**/api/pulse/news*", (r) => r.fulfill({ status: 503, body: "{}" }));
        await page.route("**/api/pulse/finance*", (r) => r.fulfill({ status: 503, body: "{}" }));
        await entrar(page, "/escritorio?abrir=noticias");
        await expect(ventanaDe(page, "noticias").getByRole("button", { name: "Reintentar" })).toBeVisible();
        await barra(page).getByRole("button", { name: /^Widgets/ }).click();
        const widgets = page.getByRole("dialog", { name: "Widgets" });
        await expect(widgets.getByText("Las fuentes no respondieron ahora.")).toBeVisible();
        await expect(widgets.getByText("El mercado no respondió ahora.")).toBeVisible();
    });

    test("preferencias de la versión anterior no rompen el escritorio", async ({ page }) => {
        const errores: string[] = [];
        page.on("pageerror", (e) => errores.push(e.message));
        await page.addInitScript(() => {
            localStorage.setItem("escritorio:sonido", JSON.stringify({ activo: true, volumen: 0.4, tipo: "suave", ventanas: true }));
            localStorage.setItem("escritorio:iconos", JSON.stringify({ proyectos: [3, 9], conversemos: [0, 0] }));
            localStorage.setItem("escritorio:fondo", "olas");
            localStorage.setItem("escritorio:prefs", "{roto");
            localStorage.setItem("escritorio:posiciones", JSON.stringify({ proyectos: [999, -2], noexiste: [0, 0] }));
            sessionStorage.setItem("escritorio:sesion", JSON.stringify([{ id: "conversemos", r: { x: 0, y: 0, w: 500, h: 400 } }, { id: "atajos" }]));
        });
        await entrar(page);
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        await expect(page.getByRole("option", { name: "Proyectos" })).toBeVisible();
        expect(errores).toEqual([]);
    });

    test("en una pantalla de 1024 × 700 el inicio cabe completo sobre la barra", async ({ page }) => {
        await entrar(page);
        await page.setViewportSize({ width: 1024, height: 700 });
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        const b = (await page.getByRole("dialog", { name: "Inicio" }).boundingBox())!;
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y + b.height).toBeLessThanOrEqual(700 - 48);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(1024);
    });

    test("el tema cambia también dentro de las ventanas", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=sobre-mi");
        const html = ventanaDe(page, "sobre-mi").locator("iframe").contentFrame().locator("html");
        await expect(html).toHaveAttribute("data-ventana", "");
        await barra(page).getByRole("button", { name: /Configuración rápida/ }).click();
        await page.getByRole("dialog", { name: "Configuración rápida" }).getByRole("button", { name: "Tema oscuro" }).click();
        await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
        await expect(html).toHaveAttribute("data-tema", "claro");
    });

    test("un enlace dentro de una página abre su propia ventana", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=sobre-mi");
        const sobre = ventanaDe(page, "sobre-mi");
        const enlace = sobre.locator("iframe").contentFrame().locator('a[href="/como-se-hizo"]').first();
        await enlace.scrollIntoViewIfNeeded();
        await expect(async () => {
            await enlace.click();
            await expect(ventanaDe(page, "como-se-hizo")).toBeVisible({ timeout: 2000 });
        }).toPass({ timeout: 15000 });
        expect(await sobre.locator("iframe").evaluate((f: HTMLIFrameElement) => f.contentWindow!.location.pathname)).toBe("/sobre-mi");
    });

    test("clic derecho en el fondo abre el menú del escritorio y cambia el tamaño de los íconos", async ({ page }) => {
        await entrar(page);
        await page.mouse.click(900, 420, { button: "right" });
        const menu = page.getByRole("menu", { name: "Menú del escritorio" });
        await expect(menu).toBeVisible();
        await menu.getByRole("menuitemradio", { name: "Íconos grandes" }).click();
        await expect(page.getByRole("listbox", { name: "Íconos del escritorio" })).toHaveAttribute("data-tam", "grandes");
    });

    test("en el celular las apps ocupan la pantalla y Atrás las cierra", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1"); sessionStorage.setItem("escritorio:dentro", "1"); } catch { /* sin almacenamiento */ } });
        await page.goto("/escritorio");
        await page.getByRole("option", { name: "Correo" }).tap();
        const v = ventanaDe(page, "correo");
        await expect(v).toBeVisible();
        await quieta(v);
        expect((await v.boundingBox())!.width).toBeGreaterThanOrEqual(388);
        await page.goBack();
        await expect(v).toHaveCount(0);
        await expect(page).toHaveURL(/\/escritorio$/);
        await page.getByRole("option", { name: "Proyectos" }).tap();
        await expect(ventanaDe(page, "proyectos")).toBeVisible();
        await barra(page).getByRole("button", { name: "Correo", exact: true }).tap();
        await expect(ventanaDe(page, "correo")).toBeVisible();
        await page.goBack();
        await expect(ventanaDe(page, "correo")).toHaveCount(0);
        await expect(ventanaDe(page, "proyectos")).toHaveCount(1);
        await ctx.close();
    });

    /* ---------- Hallazgos de la revisión independiente (26-11): cada uno con su prueba ---------- */
    test("la app del QR puede pedir la ubicación dentro de su ventana", async ({ request }) => {
        const r = await request.get("/escritorio/app/qr");
        expect(r.headers()["permissions-policy"]).toContain("geolocation=(self)");
    });

    test("clic derecho en un botón de la barra abre su menú y se queda abierto", async ({ page }) => {
        await entrar(page);
        await barra(page).getByRole("button", { name: "Correo", exact: true }).click({ button: "right" });
        await page.waitForTimeout(400);
        const menu = page.getByRole("menu", { name: "Opciones de Correo" });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole("menuitem", { name: "Desanclar de la barra de tareas" })).toBeVisible();
    });

    test("antes de hidratar no se pinta un escritorio genérico que después salte", async ({ request }) => {
        const html = await (await request.get("/escritorio")).text();
        expect(html).toContain("es-cubierta");
        expect(html).not.toContain("/escritorio/fondos/");
        expect((html.match(/left:6px;top:6px/g) ?? []).length).toBeLessThanOrEqual(1);
    });

    test("los widgets piden el clima si faltaba y cada tarjeta caída ofrece reintentar", async ({ page }) => {
        for (const api of ["news", "finance", "context"]) await page.route(`**/api/pulse/${api}*`, (r) => r.fulfill({ status: 503, body: "{}" }));
        await entrar(page);
        await expect(barra(page).getByRole("button", { name: "Widgets", exact: true })).toBeVisible();
        await page.unroute("**/api/pulse/context*");
        await page.unroute("**/api/pulse/news*");
        await barra(page).getByRole("button", { name: /^Widgets/ }).click();
        const w = page.getByRole("dialog", { name: "Widgets" });
        await expect(w.getByRole("region", { name: "Clima en Santiago" })).toContainText("°");
        await expect(w.getByRole("region", { name: "Titulares" }).getByRole("link").first()).toBeVisible();
        const indicadores = w.getByRole("region", { name: "Indicadores" });
        await expect(indicadores.getByRole("button", { name: "Reintentar" })).toBeVisible();
        await page.unroute("**/api/pulse/finance*");
        await indicadores.getByRole("button", { name: "Reintentar" }).click();
        await expect(indicadores.getByRole("listitem").first()).toBeVisible();
    });

    test("el menú de la ventana se maneja con el teclado sin mover la ventana", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const v = ventanaDe(page, "correo");
        await quieta(v);
        const antes = await v.boundingBox();
        await v.getByRole("button", { name: /^Opciones de Correo/ }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menuitem", { name: "Minimizar" })).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("menuitem", { name: "Maximizar" })).toBeFocused();
        expect(await v.boundingBox()).toEqual(antes);
    });

    test("con la barra a la izquierda los widgets siguen a mano", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("escritorio:prefs", JSON.stringify({ alinear: "izq" })));
        await entrar(page);
        await expect(barra(page)).toHaveAttribute("data-alinear", "izq");
        await expect(barra(page).getByRole("button", { name: /^Widgets/ })).toBeVisible();
    });

    test("en tema claro el botón principal se lee con contraste AA", async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("tema", "claro"));
        await entrar(page, "/escritorio?abrir=correo");
        const contraste = await ventanaDe(page, "correo").getByRole("button", { name: "Enviar" }).evaluate((b) => {
            const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
            const lum = (c: number[]) => { const [r, g, bl] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
            const s = getComputedStyle(b), a = lum(rgb(s.color)), f = lum(rgb(s.backgroundColor));
            return (Math.max(a, f) + 0.05) / (Math.min(a, f) + 0.05);
        });
        expect(contraste).toBeGreaterThanOrEqual(4.5);
    });

    test("clic derecho dentro de una app deja el menú del navegador; en el fondo, el del escritorio", async ({ page }) => {
        await page.route("**/api/pulse/news*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [
            { id: "1", title: "Titular uno", url: "https://ejemplo.cl/1", source: "Fuente", category: "ai", publishedAt: "2026-11-26T10:00:00Z", timestampLabel: "Hace 1 h" },
            { id: "2", title: "Titular dos", url: "https://ejemplo.cl/2", source: "Fuente", category: "dev", publishedAt: "2026-11-26T09:00:00Z", timestampLabel: "Hace 2 h" },
        ] }) }));
        await entrar(page, "/escritorio?abrir=noticias");
        await expect(page.locator(".no-item").first()).toBeVisible();
        const prevenido = (sel: string) => page.locator(sel).first().evaluate((el) => { const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; });
        expect(await prevenido(".no-item")).toBe(false);
        expect(await prevenido(".es-iconos")).toBe(true);
        // Sin el punto entre la fuente y la hora: los datos se separan con espacio (regla de diseño del sitio).
        expect(await page.locator(".no-item small span").first().evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
    });

    test("un error dentro de una app no tumba el escritorio", async ({ page }) => {
        await page.route("**/api/pulse/news*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [
            { id: "1", title: { roto: true }, url: "https://ejemplo.cl/1", source: "Fuente", category: "ai", publishedAt: "2026-11-26T10:00:00Z", timestampLabel: "Hace 1 h" },
        ] }) }));
        await entrar(page, "/escritorio?abrir=noticias");
        await expect(ventanaDe(page, "noticias")).toContainText("Esta app tuvo un problema");
        await expect(barra(page)).toBeVisible();
        await expect(page.getByRole("heading", { name: /Algo falló/ })).toHaveCount(0);
    });

    test("con la pantalla bloqueada, el teclado no llega al escritorio de atrás", async ({ page }) => {
        await entrar(page, "/escritorio", { bloqueo: true });
        await expect(page.getByRole("dialog", { name: /Pantalla de bloqueo/ })).toBeVisible();
        for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
        expect(await page.evaluate(() => !!document.activeElement?.closest(".es-barra, .es-mesa"))).toBe(false);
        await page.keyboard.press("Control+k");
        await expect(page.getByRole("dialog", { name: "Inicio" })).toBeHidden();
    });

    test("Acerca de dice dónde se procesa la herramienta", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=herramientas/qr");
        const v = ventanaDe(page, "herramientas/qr");
        await v.getByRole("button", { name: /^Opciones de Generador de QR/ }).click();
        await page.getByRole("menuitem", { name: /Acerca de Generador de QR/ }).click();
        const acerca = page.getByRole("dialog", { name: "Acerca de Generador de QR" });
        await expect(acerca).toContainText("Dónde se procesa");
        await expect(acerca).toContainText("vista 3D");
    });

    test("un enlace externo dentro de una página se abre en una pestaña, no en la ventana", async ({ page, context }) => {
        await context.route("https://ejemplo.cl/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>ok</p>" }));
        await entrar(page, "/escritorio?abrir=sobre-mi");
        const marco = ventanaDe(page, "sobre-mi").locator("iframe");
        const dentro = marco.contentFrame();
        await expect(dentro.locator("html")).toHaveAttribute("data-ventana", "");
        await expect(async () => {
            await dentro.locator("body").evaluate((b) => { if (!b.querySelector("#externo")) { const a = document.createElement("a"); a.id = "externo"; a.href = "https://ejemplo.cl/x"; a.textContent = "externo"; b.prepend(a); } });
            const [pestana] = await Promise.all([page.waitForEvent("popup", { timeout: 2000 }), dentro.locator("#externo").click()]);
            expect(pestana.url()).toContain("ejemplo.cl");
        }).toPass({ timeout: 15000 });
        expect(await marco.evaluate((f: HTMLIFrameElement) => f.contentWindow!.location.pathname)).toBe("/sobre-mi");
    });

    test("en el celular, Atrás cierra la app que se ve aunque se haya cambiado desde la barra", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1"); sessionStorage.setItem("escritorio:dentro", "1"); } catch { /* sin almacenamiento */ } });
        await page.goto("/escritorio");
        await page.getByRole("option", { name: "Proyectos" }).tap();
        await expect(ventanaDe(page, "proyectos")).toBeVisible();
        // Un toque en el Explorador abre la carpeta (en pantallas táctiles no hace falta doble toque).
        await ventanaDe(page, "proyectos").getByRole("option").first().tap();
        await expect(ventanaDe(page, "proyectos").getByRole("option", { name: "Portada.jpg" })).toBeVisible();
        await barra(page).getByRole("button", { name: "Correo", exact: true }).tap();
        await expect(ventanaDe(page, "correo")).toBeVisible();
        await barra(page).getByRole("button", { name: "Proyectos", exact: true }).tap();
        await page.goBack();
        await expect(ventanaDe(page, "proyectos")).toHaveCount(0);
        await expect(ventanaDe(page, "correo")).toHaveCount(1);
        await ctx.close();
    });

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
