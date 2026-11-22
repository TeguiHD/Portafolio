import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Invitación a instalar la app: una barra baja que no bloquea la página (nada de modales al cargar), aparece en el
 * celular cuando el visitante ya bajó por la página, se cierra con «Ahora no» y no vuelve en 30 días.
 * Chrome no dispara `beforeinstallprompt` en un navegador de pruebas: se simula con un evento falso.
 */
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

async function celular(browser: Browser, opciones: { userAgent?: string; ancho?: number; alto?: number } = {}): Promise<Page> {
    const ctx = await browser.newContext({ viewport: { width: opciones.ancho ?? 390, height: opciones.alto ?? 844 }, isMobile: true, hasTouch: true, userAgent: opciones.userAgent });
    return ctx.newPage();
}

async function entrar(page: Page, { conEvento = true } = {}) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas#materia")).toHaveAttribute("data-forma-activa", /.+/); // ya hidrató
    if (conEvento) await page.evaluate(() => {
        const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & Record<string, unknown>;
        e.prompt = async () => { (window as unknown as Record<string, boolean>).__pidioInstalar = true; };
        e.userChoice = Promise.resolve({ outcome: "accepted" });
        dispatchEvent(e);
        (window as unknown as Record<string, boolean>).__anulado = e.defaultPrevented;
    });
}

const bajar = (page: Page) => page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, innerHeight * 1.5); });
const invitacion = (page: Page) => page.getByRole("region", { name: /^(Instala|Agrega) nicoholas\.dev/ });

test("no aparece al cargar: recién cuando el visitante baja por la página", async ({ browser }) => {
    const page = await celular(browser);
    await entrar(page);
    await page.waitForTimeout(800);
    await expect(invitacion(page)).toHaveCount(0);
    await bajar(page);
    await expect(invitacion(page)).toBeVisible();
    await expect(invitacion(page)).toContainText("Instala nicoholas.dev");
    // Aparece mientras la persona lee: no le quita el foco (un <dialog> lo movería a su primer botón).
    expect(await page.evaluate(() => document.activeElement?.closest(".invitar") ?? null)).toBeNull();
});

test("«Instalar» abre el diálogo del navegador y la invitación se va; el aviso propio de Chrome no se duplica", async ({ browser }) => {
    const page = await celular(browser);
    await entrar(page);
    expect(await page.evaluate(() => (window as unknown as Record<string, boolean>).__anulado)).toBe(true);
    await bajar(page);
    await invitacion(page).getByRole("button", { name: "Instalar" }).click();
    expect(await page.evaluate(() => (window as unknown as Record<string, boolean>).__pidioInstalar)).toBe(true);
    await expect(invitacion(page)).toHaveCount(0);
});

test("«Ahora no» la cierra y no vuelve en la próxima visita", async ({ browser }) => {
    const page = await celular(browser);
    await entrar(page);
    await bajar(page);
    await invitacion(page).getByRole("button", { name: "Ahora no" }).click();
    await expect(invitacion(page)).toHaveCount(0);
    await entrar(page);
    await bajar(page);
    await page.waitForTimeout(800);
    await expect(invitacion(page)).toHaveCount(0);
});

test("no bloquea: la página sigue usable y la barra ocupa menos del 15 % de la pantalla", async ({ browser }) => {
    for (const [ancho, alto] of [[390, 844], [360, 740]]) {
        const page = await celular(browser, { ancho, alto });
        await entrar(page);
        await bajar(page);
        await expect(invitacion(page)).toBeVisible();
        const caja = (await invitacion(page).boundingBox())!;
        expect(caja.height / alto, `${ancho}×${alto}`).toBeLessThan(0.15);
        expect(caja.x, "dentro de la pantalla").toBeGreaterThanOrEqual(0);
        expect(caja.x + caja.width, "dentro de la pantalla").toBeLessThanOrEqual(ancho);
        expect(await page.evaluate(() => document.querySelector("dialog:modal"))).toBeNull();
        await page.context().close();
    }
});

test("en iPhone explica el paso a paso (no hay diálogo de instalación)", async ({ browser }) => {
    const page = await celular(browser, { userAgent: IPHONE });
    await entrar(page, { conEvento: false });
    await bajar(page);
    await expect(invitacion(page)).toContainText("Agregar a inicio");
    await invitacion(page).getByRole("button", { name: "Entendido" }).click();
    await expect(invitacion(page)).toHaveCount(0);
});

test("en el computador no aparece (ahí está el ícono de instalar del navegador)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await entrar(page);
    await bajar(page);
    await page.waitForTimeout(800);
    await expect(invitacion(page)).toHaveCount(0);
});

test("sin nada que instalar (navegador sin soporte o app ya instalada), no aparece", async ({ browser }) => {
    const page = await celular(browser);
    await entrar(page, { conEvento: false });
    await bajar(page);
    await page.waitForTimeout(800);
    await expect(invitacion(page)).toHaveCount(0);
});
