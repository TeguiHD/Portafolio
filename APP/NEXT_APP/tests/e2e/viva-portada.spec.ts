import { expect, test } from "@playwright/test";
import { PORTADA } from "./viva-utils";

test.describe("Materia viva: la portada completa", () => {
    test("las seis secciones, en orden, y un solo título principal", async ({ page }) => {
        await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
        const ids = await page.locator("main section[id]").evaluateAll((s) => s.map((x) => x.id));
        expect(ids).toEqual(["inicio", "proyectos", "herramientas", "blog", "contacto", "firma"]);
        await expect(page.locator("h1")).toHaveCount(1);
        // Lo de la portada anterior ya no está.
        await expect(page.locator("[data-barra-anterior], [data-pie-anterior]")).toHaveCount(0);
    });

    for (const [ancho, alto] of [[390, 844], [1440, 900]] as const) {
        test(`se recorre entera sin errores ni desborde (${ancho} px)`, async ({ page }) => {
            const errores: string[] = [];
            page.on("pageerror", (e) => errores.push(String(e)));
            await page.setViewportSize({ width: ancho, height: alto });
            await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
            const lienzo = page.locator("canvas#materia");
            await expect(lienzo).toHaveAttribute("data-forma-activa", "figuras");
            // Cada sección le pide a la materia su forma.
            // En celular las formas de fondo se apagan («marco» sin opacidad): la esfera se cambia por una lista y las olas
            // ya no pasan por encima del texto. La materia queda donde es el contenido.
            const celular = ancho <= 760;
            for (const [id, forma] of [["proyectos", "imagen"], ["herramientas", celular ? "marco" : "texto"], ["blog", celular ? "marco" : "olas"], ["contacto", "anillo"], ["firma", "firma"]] as const) {
                await page.evaluate((x) => document.getElementById(x)!.scrollIntoView({ behavior: "instant", block: "center" }), id);
                await expect(lienzo, `forma en #${id}`).toHaveAttribute("data-forma-activa", forma);
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
            expect(errores).toEqual([]);
        });
    }

    test("las secciones se acercan y se alejan siguiendo el desplazamiento de la página", async ({ page }) => {
        await page.goto(PORTADA);
        const leer = () => page.evaluate(() => {
            const a = document.querySelector("section.plano > .ancho")?.getAnimations()[0];
            if (!a) return null;
            const linea = a.timeline as unknown as { source?: Element | null };
            return { raiz: linea.source === document.scrollingElement, avance: a.effect?.getComputedTiming().progress ?? null };
        });
        const antes = await leer();
        test.skip(!antes, "el navegador no tiene animation-timeline");
        expect(antes!.raiz, "la línea de tiempo es el desplazamiento de la página").toBe(true);
        await page.evaluate(() => scrollTo(0, 900));
        await expect.poll(async () => (await leer())!.avance).not.toBe(antes!.avance);
    });

    test.describe("sin JavaScript", () => {
        test.use({ javaScriptEnabled: false });
        test("siguen los proyectos, el número de herramientas, el correo y un enlace a cada herramienta", async ({ page }) => {
            await page.goto(PORTADA, { waitUntil: "domcontentloaded" });
            const proyectos = page.locator("#proyectos");
            for (const nombre of await proyectos.locator("[role=tab]").allTextContents()) expect(nombre.trim().length).toBeGreaterThan(2);
            await expect(proyectos.locator("[role=tab]")).toHaveCount(3);
            await expect(page.locator("#herramientas")).toContainText("Ver las 33");
            await expect(page.locator("#contacto")).toContainText("contacto@nicoholas.dev");
            // Sin scripts nada se queda esperando a que lo revelen.
            await expect(page.locator("#contacto .ct-pre")).toHaveCSS("opacity", "1");
            expect(await page.locator('.sin-js a[href^="/herramientas/"]').count()).toBe(33);
        });
    });
});
