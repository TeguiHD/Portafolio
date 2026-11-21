import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY } from "../../src/lib/tool-registry";

/**
 * Ronda 3: el interior de las 29 habla el mismo idioma. Sin emojis de adorno junto a las palabras (los que son contenido,
 * como los de esteganografía con emojis, no cuentan: van solos) y sin degradados en los botones: la acción principal es el
 * botón sólido del sitio, como en contraseñas e IVA.
 */
const ADORNOS = () => {
    const emoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u;
    const letras = /\p{L}{2,}/u;
    const raiz = document.querySelector("#tools-content main") ?? document.querySelector("#tools-content")!;
    const sel = "button, [role=tab], h1, h2, h3, h4, label, summary, legend, th, li, p";
    const visibles = [...raiz.querySelectorAll<HTMLElement>(sel)].filter((e) => e.checkVisibility());
    // Emoji y palabras en el mismo rótulo (aunque el emoji vaya en un <span> aparte). Se nombra el más interno.
    // Un emoji que es contenido de ejemplo va en <kbd>/<code>/<samp> y no cuenta.
    const texto = (e: HTMLElement) => { const c = e.cloneNode(true) as HTMLElement; c.querySelectorAll("kbd, code, samp").forEach((k) => k.remove()); return c.textContent ?? ""; };
    const conEmoji = visibles.filter((e) => { const t = texto(e); return emoji.test(t) && letras.test(t); });
    const malos = conEmoji.filter((e) => !conEmoji.some((o) => o !== e && e.contains(o))).map((e) => `emoji: «${(e.textContent ?? "").trim().slice(0, 50)}»`);
    for (const b of visibles) if (b.tagName === "BUTTON" && getComputedStyle(b).backgroundImage.includes("gradient")) malos.push(`degradado: «${(b.textContent ?? "").trim().slice(0, 40)}»`);
    return [...new Set(malos)];
};

test.describe("Herramientas, ronda 3", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("las 29: sin emojis de adorno ni botones con degradado", async ({ page }) => {
        test.setTimeout(240_000);
        const todos: string[] = [];
        for (const { slug } of DEFAULT_TOOL_REGISTRY) {
            await page.goto(`/herramientas/${slug}`);
            await page.getByRole("heading", { level: 1 }).waitFor();
            for (const m of await page.evaluate(ADORNOS)) todos.push(`${slug} → ${m}`);
        }
        expect(todos).toEqual([]);
    });

    test("sorteos abre con participantes de ejemplo: la ruleta se puede girar sin escribir nada", async ({ page }) => {
        await page.goto("/herramientas/aleatorio");
        await expect(page.getByRole("button", { name: /Girar ruleta/ })).toBeEnabled();
        await expect(page.locator("#tools-content")).not.toContainText("Ingresa al menos 2 participantes");
    });

    test("unidades abre con un ejemplo ya convertido: 1 km en millas", async ({ page }) => {
        await page.goto("/herramientas/unidades");
        await expect(page.locator("#unidades-valor")).toHaveValue("1");
        await expect(page.locator("output[for=unidades-valor]")).toContainText("0,621");
    });

    test("reverse shells abre con una IP de ejemplo: cada comando ya viene armado", async ({ page }) => {
        await page.goto("/herramientas/reverse-shell");
        await expect(page.locator("#tools-content")).not.toContainText("Introduce una IP y puerto válidos");
        await expect(page.locator("#tools-content")).toContainText("10.10.14.5");
    });

    test("contraseñas: la caja se ajusta a una clave de una línea (antes, 144 px por los 3 botones apilados al lado)", async ({ page }) => {
        await page.goto("/herramientas/claves");
        const caja = page.locator("#clave-generada");
        await expect(caja).not.toBeEmpty();
        expect((await caja.boundingBox())!.height).toBeLessThanOrEqual(64);
    });
});
