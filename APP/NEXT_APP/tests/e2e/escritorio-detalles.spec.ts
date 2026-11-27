import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { barra, entrar, quieta, ventanaDe } from "./escritorio-ayudas";

/**
 * Modo escritorio: los detalles que la revisión independiente del 26-11 dejó como menores (pedido del dueño el 27-11,
 * «sigue con los detalles pendientes del escritorio»). Cada prueba nombra lo que una persona notaría si se rompe.
 */
test.use({ serviceWorkers: "block" });

const BLOQUEO = /Pantalla de bloqueo/;
const enfocada = (v: Locator) => v.evaluate((el) => el.contains(document.activeElement));

/**
 * El contraste de un texto del bloqueo con lo que tiene detrás: se fotografía la caja de las letras con el texto oculto
 * (queda el fondo con lo que lo oscurezca) y se toma el 5 % peor de los píxeles, con el color y la opacidad del texto.
 */
async function contrasteDetras(page: Page, sel: string): Promise<number> {
    const el = page.locator(sel);
    const { caja, tinta, alfa } = await el.evaluate((e) => {
        const r = document.createRange(); r.selectNodeContents(e);
        const b = r.getBoundingClientRect(), estilo = getComputedStyle(e);
        (e as HTMLElement).style.visibility = "hidden";
        return { caja: { x: b.x, y: b.y, width: b.width, height: b.height }, tinta: (estilo.color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), alfa: Number(estilo.opacity) };
    });
    const png = await page.screenshot({ clip: caja, animations: "disabled" });
    await el.evaluate((e) => { (e as HTMLElement).style.visibility = ""; });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const c: number[] = [];
    for (let i = 0; i < data.length; i += info.channels) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const fondo = lum(r, g, b), letra = lum(tinta[0] * alfa + r * (1 - alfa), tinta[1] * alfa + g * (1 - alfa), tinta[2] * alfa + b * (1 - alfa));
        c.push((Math.max(fondo, letra) + 0.05) / (Math.min(fondo, letra) + 0.05));
    }
    c.sort((x, y) => x - y);
    return c[Math.floor(c.length * 0.05)];
}

test.describe("modo escritorio: detalles", () => {
    test("la hora y la fecha del bloqueo se leen también sobre los fondos claros", async ({ page }) => {
        await entrar(page, "/escritorio", { bloqueo: true });
        for (const p of [{ fondo: "cordillera" }, { fondo: "papel" }, { fondo: "solido", solido: "#f2ece3" }, { fondo: "solido", solido: "#e8eef3" }]) {
            await page.evaluate((x) => localStorage.setItem("escritorio:prefs", JSON.stringify(x)), p);
            await page.reload();
            const bloqueo = page.getByRole("dialog", { name: BLOQUEO });
            await expect(bloqueo.locator(".es-bloqueo-hora")).toHaveText(/\d{2}:\d{2}/);
            if (p.fondo !== "solido") await expect.poll(() => bloqueo.locator(".es-fondo img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
            const nombre = p.solido ? `${p.fondo} ${p.solido}` : p.fondo;
            // La hora y la fecha (24 px a este ancho) son texto grande: 3:1. La pista es chica: 4,5:1.
            expect.soft(await contrasteDetras(page, ".es-bloqueo-hora"), `hora sobre ${nombre}`).toBeGreaterThanOrEqual(3);
            expect.soft(await contrasteDetras(page, ".es-bloqueo-fecha"), `fecha sobre ${nombre}`).toBeGreaterThanOrEqual(3);
            expect.soft(await contrasteDetras(page, ".es-bloqueo-pista"), `pista sobre ${nombre}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    test("la materia viva descansa detrás del bloqueo y al entrar sigue la misma, sin rehacerse", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("escritorio:prefs", JSON.stringify({ fondo: "materia-viva" }));
            const w = window as unknown as { __cuadros: number; __motores: number };
            w.__cuadros = 0; w.__motores = 0;
            const limpiar = CanvasRenderingContext2D.prototype.clearRect;
            CanvasRenderingContext2D.prototype.clearRect = function (this: CanvasRenderingContext2D, ...a: Parameters<typeof limpiar>) {
                if (this.canvas.classList?.contains("es-lienzo")) w.__cuadros++;
                return limpiar.apply(this, a);
            };
            const contexto = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...a: unknown[]) {
                if (this.classList.contains("es-lienzo")) w.__motores++;
                return (contexto as (...x: unknown[]) => RenderingContext | null).apply(this, a);
            } as typeof contexto;
        });
        const leer = (page: Page) => page.evaluate(() => { const w = window as unknown as { __cuadros: number; __motores: number }; return { cuadros: w.__cuadros, motores: w.__motores }; });
        const cuadrosEnUnSegundo = async () => { const a = (await leer(page)).cuadros; await page.waitForTimeout(1000); return (await leer(page)).cuadros - a; };
        await entrar(page, "/escritorio", { bloqueo: true });
        await expect(page.getByRole("dialog", { name: BLOQUEO })).toBeVisible();
        await expect.poll(async () => (await leer(page)).motores).toBe(1);
        expect(await cuadrosEnUnSegundo(), "cuadros pintados detrás del bloqueo").toBeLessThanOrEqual(2);
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog", { name: BLOQUEO })).toHaveCount(0);
        expect(await cuadrosEnUnSegundo(), "cuadros pintados con el escritorio a la vista").toBeGreaterThan(20);
        expect((await leer(page)).motores, "motores creados").toBe(1);
    });

    test("la campana marca lo nuevo aunque antes se haya descartado una notificación", async ({ page, context }) => {
        await entrar(page);
        const reloj = barra(page).locator(".es-reloj");
        await context.setOffline(true);
        await expect(page.locator(".es-toast").getByText("Sin conexión")).toBeVisible();
        await context.setOffline(false);
        await expect(page.locator(".es-toast").getByText("Conexión de vuelta")).toBeVisible();
        await expect(reloj).toHaveAttribute("aria-label", /2 notificaciones nuevas\./);
        await reloj.click();
        const panel = page.getByRole("dialog", { name: "Notificaciones y calendario" });
        await panel.getByRole("button", { name: "Descartar «Sin conexión»" }).click();
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(reloj).not.toHaveAttribute("aria-label", /nuevas?\./);
        await context.setOffline(true);
        await expect(page.locator(".es-toast").getByText("Sin conexión")).toBeVisible();
        await expect(reloj).toHaveAttribute("aria-label", /1 notificación nueva\./);
    });

    test("cerca del borde de abajo, el menú de la ventana y los diseños de acople se abren hacia arriba", async ({ page }) => {
        await page.addInitScript(() => sessionStorage.setItem("escritorio:sesion", JSON.stringify([
            { id: "correo", args: {}, r: { x: 300, y: 790, w: 780, h: 620 }, previo: null, zona: null, min: false, z: 11 },
        ])));
        await entrar(page);
        const v = ventanaDe(page, "correo");
        await expect(v).toBeVisible();
        await quieta(v);
        const sobreLaBarra = async (l: Locator, nombre: string) => {
            await quieta(l);
            const b = (await l.boundingBox())!;
            expect(b.y, `${nombre}: arriba`).toBeGreaterThanOrEqual(0);
            expect(b.y + b.height, `${nombre}: abajo`).toBeLessThanOrEqual(900 - 48);
        };
        await v.getByRole("button", { name: /^Opciones de Correo/ }).click();
        const menu = page.getByRole("menu", { name: "Opciones de Correo" });
        await expect(menu).toBeVisible();
        await sobreLaBarra(menu, "menú de la ventana");
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await v.getByRole("button", { name: "Maximizar" }).hover();
        const acople = page.getByRole("group", { name: "Diseños de acople" });
        await expect(acople).toBeVisible();
        await sobreLaBarra(acople, "diseños de acople");
    });

    test("abrir Proyectos otra vez desde el inicio vuelve a la carpeta; la barra de tareas solo la trae al frente", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Proyectos" }).dblclick();
        const ex = ventanaDe(page, "proyectos");
        await ex.getByRole("listbox", { name: "Proyectos" }).getByRole("option").first().dblclick();
        await expect(ex.getByRole("option", { name: "Portada.jpg" })).toBeVisible();
        await barra(page).getByRole("button", { name: "Correo", exact: true }).click();
        await expect(ventanaDe(page, "correo")).toHaveAttribute("data-activa");
        await barra(page).getByRole("button", { name: "Proyectos", exact: true }).click();
        await expect(ex).toHaveAttribute("data-activa");
        await expect(ex.getByRole("option", { name: "Portada.jpg" })).toBeVisible();
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        await page.locator(".es-anclado").getByRole("button", { name: "Proyectos" }).click();
        await expect(ex.getByRole("listbox", { name: "Proyectos" }).getByRole("option")).toHaveCount(3);
    });

    test("pedir de nuevo una sección de Configuración la muestra aunque se haya cambiado de sección", async ({ page }) => {
        await entrar(page);
        const pedirSonido = async () => {
            await barra(page).getByRole("button", { name: "Buscar", exact: true }).click();
            await page.getByRole("searchbox", { name: "Buscar en el escritorio" }).fill("sonido");
            await page.getByRole("dialog", { name: "Inicio" }).getByRole("button", { name: /Sonido del clic y volumen/ }).click();
        };
        await pedirSonido();
        const cf = ventanaDe(page, "configuracion");
        await expect(cf.locator(".cf-titulo")).toHaveText("Sonido");
        await cf.getByRole("navigation", { name: "Secciones de Configuración" }).getByRole("button", { name: "Personalización" }).click();
        await expect(cf.locator(".cf-titulo")).toHaveText("Personalización");
        await pedirSonido();
        await expect(cf.locator(".cf-titulo")).toHaveText("Sonido");
    });

    test("traer una ventana desde la barra le da el foco; al cerrar, pasa a la que queda y al final a los íconos", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const correo = ventanaDe(page, "correo"), noticias = ventanaDe(page, "noticias");
        await expect(correo).toBeVisible();
        await barra(page).getByRole("button", { name: "Noticias", exact: true }).click();
        await expect(noticias).toHaveAttribute("data-activa");
        await expect.poll(() => enfocada(noticias)).toBe(true);
        await barra(page).getByRole("button", { name: "Correo", exact: true }).click();
        await expect(correo).toHaveAttribute("data-activa");
        await expect.poll(() => enfocada(correo), { message: "el foco pasa a la ventana traída al frente" }).toBe(true);
        await correo.getByRole("button", { name: "Cerrar" }).focus();
        await page.keyboard.press("Enter");
        await expect(correo).toHaveCount(0);
        await expect.poll(() => enfocada(noticias), { message: "al cerrar, el foco pasa a la que queda al frente" }).toBe(true);
        await noticias.getByRole("button", { name: "Cerrar" }).focus();
        await page.keyboard.press("Enter");
        await expect(noticias).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest(".es-iconos")), { message: "sin ventanas, el foco vuelve a los íconos" }).toBe(true);
    });

    test("el menú de apagado abierto con el teclado enfoca su primera opción; con el mouse, la flecha abajo entra", async ({ page }) => {
        await entrar(page);
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        const apagado = page.getByRole("button", { name: /^Apagado/ });
        await apagado.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menuitem", { name: "Bloquear" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu", { name: "Apagado" })).toBeHidden();
        await apagado.click();
        await expect(page.getByRole("menu", { name: "Apagado" })).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("menuitem", { name: "Bloquear" })).toBeFocused();
    });

    test("minimizada desde su menú y traída desde la barra, la ventana recibe el foco", async ({ page }) => {
        await entrar(page, "/escritorio?abrir=correo");
        const correo = ventanaDe(page, "correo");
        await quieta(correo);
        await correo.getByRole("button", { name: /^Opciones de Correo/ }).click();
        await page.getByRole("menuitem", { name: "Minimizar" }).click();
        await expect(correo).toBeHidden();
        await barra(page).getByRole("button", { name: "Correo", exact: true }).click();
        await expect(correo).toBeVisible();
        await expect.poll(() => enfocada(correo), { message: "el foco entra a la ventana, no a un menú cerrado" }).toBe(true);
    });

    test("el menú de apagado entra con Enter aunque antes se haya presionado su botón sin abrirlo", async ({ page }) => {
        await entrar(page);
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        const apagado = page.getByRole("button", { name: /^Apagado/ });
        // Presionar y arrastrar fuera antes de soltar: no abre el menú.
        const b = (await apagado.boundingBox())!;
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x - 200, b.y - 200, { steps: 4 });
        await page.mouse.up();
        await expect(page.getByRole("menu", { name: "Apagado" })).toBeHidden();
        await apagado.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menuitem", { name: "Bloquear" })).toBeFocused();
    });

    test("en el celular, volver a una app desde la barra no abre el teclado en el campo de antes", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1"); sessionStorage.setItem("escritorio:dentro", "1"); } catch { /* sin almacenamiento */ } });
        await page.goto("/escritorio?abrir=correo");
        const correo = ventanaDe(page, "correo");
        await correo.getByRole("textbox", { name: "Tu correo" }).tap();
        await expect(correo.getByRole("textbox", { name: "Tu correo" })).toBeFocused();
        await barra(page).getByRole("button", { name: "Noticias", exact: true }).tap();
        await expect(ventanaDe(page, "noticias")).toHaveAttribute("data-activa");
        await barra(page).getByRole("button", { name: "Correo", exact: true }).tap();
        await expect(correo).toHaveAttribute("data-activa");
        await expect.poll(() => enfocada(correo)).toBe(true);
        expect(await page.evaluate(() => document.activeElement?.matches("input, textarea") ?? false), "un campo con el foco abre el teclado").toBe(false);
        await ctx.close();
    });

    test("el menú de apagado se abre junto a su botón, justo arriba de él", async ({ page }) => {
        await entrar(page);
        await barra(page).getByRole("button", { name: "Inicio", exact: true }).click();
        const boton = page.getByRole("button", { name: /^Apagado/ });
        await boton.click();
        const menu = page.getByRole("menu", { name: "Apagado" });
        await expect(menu).toBeVisible();
        await quieta(menu);
        const b = (await boton.boundingBox())!, m = (await menu.boundingBox())!;
        expect(m.y + m.height, "termina sobre el botón").toBeLessThanOrEqual(b.y);
        expect(b.y - (m.y + m.height), "pegado al botón").toBeLessThan(16);
        expect(Math.abs(m.x + m.width - (b.x + b.width)), "alineado con el borde derecho del botón").toBeLessThan(16);
    });

    test("abierta en una pestaña, la herramienta sigue donde estaba (el QR en Wi-Fi)", async ({ page, context }) => {
        await entrar(page, "/escritorio?abrir=herramientas/qr");
        const v = ventanaDe(page, "herramientas/qr");
        const marco = v.locator("iframe");
        await expect(async () => {
            await marco.contentFrame().getByRole("button", { name: /Wi.?Fi/ }).first().click();
            await expect.poll(() => marco.evaluate((f: HTMLIFrameElement) => f.contentWindow!.location.search), { timeout: 2000 }).toContain("tipo=wifi");
        }).toPass({ timeout: 20000 });
        await v.getByRole("button", { name: /^Opciones de Generador de QR/ }).click();
        const [pestana] = await Promise.all([context.waitForEvent("page"), page.getByRole("menuitem", { name: "Abrir en una pestaña" }).click()]);
        await pestana.waitForURL(/\/herramientas\/qr/);
        const u = new URL(pestana.url());
        expect(u.pathname + u.search).toBe("/herramientas/qr?tipo=wifi");
    });

    test("fuera de una ventana, la app lleva a la herramienta sin perder lo que trae la dirección", async ({ page }) => {
        await page.goto("/escritorio/app/qr?tipo=wifi");
        await expect(page).toHaveURL(/\/herramientas\/qr\?tipo=wifi$/);
    });

    test("el Explorador tiene «Escritorio» con los mismos íconos y sus carpetas se abren ahí mismo", async ({ page }) => {
        await entrar(page);
        const nombres = (await page.getByRole("listbox", { name: "Íconos del escritorio" }).getByRole("option").allTextContents()).map((t) => t.trim());
        expect(nombres).toHaveLength(10);
        await barra(page).getByRole("button", { name: "Explorador de archivos", exact: true }).click();
        const ex = ventanaDe(page, "explorador");
        await ex.getByRole("navigation", { name: "Carpetas" }).getByRole("button", { name: "Escritorio" }).click();
        const lista = ex.getByRole("listbox", { name: "Escritorio" });
        await expect(lista.getByRole("option")).toHaveText(nombres);
        await lista.getByRole("option", { name: "Proyectos" }).dblclick();
        await expect(ex.getByRole("listbox", { name: "Proyectos" }).getByRole("option")).toHaveCount(3);
        await expect(ventanaDe(page, "proyectos")).toHaveCount(0);
        await ex.getByRole("button", { name: "Atrás" }).click();
        await ex.getByRole("listbox", { name: "Escritorio" }).getByRole("option", { name: "Correo" }).dblclick();
        await expect(ventanaDe(page, "correo")).toBeVisible();
    });

    test("en el Explorador, elegir un elemento no corre la grilla: el doble clic abre lo que se apuntó", async ({ page }) => {
        await entrar(page);
        await page.getByRole("option", { name: "Herramientas" }).dblclick();
        const ex = ventanaDe(page, "herramientas");
        const familia = ex.getByRole("listbox", { name: "Herramientas" }).getByRole("option").nth(4);
        await quieta(ex);
        const antes = await familia.boundingBox();
        await familia.click();
        await expect(familia).toHaveAttribute("aria-selected", "true");
        expect(await familia.boundingBox(), "el elemento sigue donde estaba").toEqual(antes);
    });

    test("en una pantalla táctil, con el sonido apagado no se fabrica ningún sonido hasta encenderlo", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
            try { localStorage.setItem("escritorio:visto", "1"); localStorage.setItem("escritorio:bienvenida", "1"); sessionStorage.setItem("escritorio:dentro", "1"); } catch { /* sin almacenamiento */ }
            const w = window as unknown as { __buferes: number };
            w.__buferes = 0;
            const Original = window.AudioBuffer;
            window.AudioBuffer = class extends Original { constructor(o: AudioBufferOptions) { super(o); w.__buferes++; } } as typeof AudioBuffer;
        });
        const buferes = () => page.evaluate(() => (window as unknown as { __buferes: number }).__buferes);
        await page.goto("/escritorio");
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        await page.waitForTimeout(800);
        expect(await buferes(), "sonidos fabricados con el sonido apagado").toBe(0);
        await barra(page).getByRole("button", { name: "Buscar", exact: true }).tap();
        await page.getByRole("searchbox", { name: "Buscar en el escritorio" }).fill("sonido");
        await page.getByRole("dialog", { name: "Inicio" }).getByRole("button", { name: /Sonido del clic y volumen/ }).tap();
        await ventanaDe(page, "configuracion").getByRole("switch", { name: "Sonidos del escritorio" }).tap();
        await expect.poll(buferes, { message: "al encenderlo se fabrican" }).toBeGreaterThan(0);
        await ctx.close();
    });

    test("en el celular, la bienvenida dice que se toca un ícono, no doble clic", async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("escritorio:visto", "1"); } catch { /* sin almacenamiento */ } });
        await page.goto("/escritorio");
        const bloqueo = page.getByRole("dialog", { name: BLOQUEO });
        await expect(bloqueo).toBeVisible();
        await page.waitForTimeout(450);
        await bloqueo.tap();
        const aviso = page.locator(".es-toast", { hasText: "Este es mi escritorio" });
        await expect(aviso).toBeVisible();
        await expect(aviso).toContainText("Toca un ícono");
        await expect(aviso).not.toContainText("Doble clic");
        await ctx.close();
    });

    test("el clic también suena dentro de una ventana con una página del sitio", async ({ page }) => {
        await page.addInitScript(() => {
            const w = window as unknown as { __clics: number };
            w.__clics = 0;
            const original = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: Parameters<typeof original>) { w.__clics++; return original.apply(this, a); };
        });
        await entrar(page, "/escritorio?abrir=sobre-mi");
        await expect(page.locator(".es")).toHaveAttribute("data-sonido", "listo");
        const marco = ventanaDe(page, "sobre-mi").locator("iframe");
        await expect(marco.contentFrame().locator("html")).toHaveAttribute("data-ventana", "");
        const clics = () => page.evaluate(() => (window as unknown as { __clics: number }).__clics);
        const antes = await clics();
        const b = (await marco.boundingBox())!;
        // A la izquierda del contenido: un margen sin enlaces, para no abrir otra ventana.
        await page.mouse.click(b.x + 12, b.y + b.height / 2);
        await expect.poll(clics).toBeGreaterThanOrEqual(antes + 2);
    });

    test("en una pantalla de 1024 × 700, la configuración rápida, el calendario y los widgets caben sobre la barra", async ({ page }) => {
        await entrar(page);
        await page.setViewportSize({ width: 1024, height: 700 });
        for (const [boton, nombre] of [[/^Configuración rápida/, "Configuración rápida"], [/Abrir el calendario/, "Notificaciones y calendario"], [/^Widgets/, "Widgets"]] as const) {
            await barra(page).getByRole("button", { name: boton }).click();
            const panel = page.getByRole("dialog", { name: nombre });
            await expect(panel).toBeVisible();
            await quieta(panel);
            const b = (await panel.boundingBox())!;
            expect(b.y, `${nombre}: arriba`).toBeGreaterThanOrEqual(0);
            expect(b.y + b.height, `${nombre}: abajo`).toBeLessThanOrEqual(700 - 48);
            expect(b.x, `${nombre}: izquierda`).toBeGreaterThanOrEqual(0);
            expect(b.x + b.width, `${nombre}: derecha`).toBeLessThanOrEqual(1024);
            await page.keyboard.press("Escape");
            await expect(panel).toBeHidden();
        }
    });

    test("una herramienta cuenta una visita por sesión, la abran en el sitio o en el escritorio", async ({ page }) => {
        test.skip(/nicoholas\.dev/.test(process.env.PLAYWRIGHT_BASE_URL ?? ""), "se hace pasar por una persona: no contra producción");
        // Como una persona (los navegadores automatizados no cuentan); los envíos se contestan aquí y no llegan al servidor.
        await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
        let visitas = 0;
        await page.route("**/api/**", (r) => {
            if (r.request().method() !== "POST") return r.continue();
            if (/\/api\/tools\/public\/base64$/.test(r.request().url()) && r.request().postDataJSON()?.action === "view") visitas++;
            return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
        });
        await page.goto("/herramientas/base64");
        await expect.poll(() => visitas).toBe(1);
        await page.reload();
        await entrar(page, "/escritorio?abrir=herramientas/base64");
        await expect(ventanaDe(page, "herramientas/base64").locator("iframe").contentFrame().locator("html")).toHaveAttribute("data-ventana", "");
        await page.waitForTimeout(800);
        expect(visitas).toBe(1);
    });

    test("el fondo de respaldo también lleva la versión, para no mostrar una imagen vieja guardada", async ({ page }) => {
        await entrar(page);
        await expect(page.locator(".es > .es-fondo img")).toHaveAttribute("src", /\?v=\d+$/);
    });
});
