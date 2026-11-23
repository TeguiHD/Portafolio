import { expect, test, type Page } from "@playwright/test";

/**
 * Nada cortado a los lados en celulares, desde los más angostos (240 px: Galaxy Fold cerrado, modo adaptable de Firefox).
 * Recorre la página de arriba abajo y junta cada elemento con texto (o botón, enlace, imagen) que asoma fuera de la pantalla.
 * Sin excepciones para listas deslizables: un nombre cortado («Herr…») también es un corte.
 */
async function cortes(page: Page, { deslizables = false } = {}): Promise<string[]> {
    return page.evaluate(async (deslizables) => {
        document.documentElement.style.scrollBehavior = "auto";
        const vistos = new Set<string>();
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 250));
            for (const e of document.querySelectorAll<HTMLElement>("body *")) {
                if (e.closest("[aria-hidden=true], canvas, svg, script, style, noscript, dialog:not([open]), [popover]:not(:popover-open)")) continue;
                const cs = getComputedStyle(e);
                if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
                const r = e.getBoundingClientRect();
                if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
                if (r.right <= innerWidth + 1 && r.left >= -1) continue;
                if (deslizables) {
                    let desliza = false;
                    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { desliza = true; break; }
                    if (desliza) continue;
                }
                const hoja = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) || /^(IMG|INPUT|BUTTON|VIDEO|A)$/.test(e.tagName);
                if (hoja) vistos.add(`${e.tagName.toLowerCase()}.${e.className.toString().split(" ")[0]} «${(e.textContent ?? "").trim().slice(0, 30)}» [${Math.round(r.left)}→${Math.round(r.right)}]`);
            }
            // Las letras mismas: un texto puede salirse de su caja (un botón con min-width: 44px se achica más que su palabra).
            const textos = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let n = textos.nextNode(); n; n = textos.nextNode()) {
                const padre = n.parentElement;
                if (!padre || !n.textContent!.trim() || padre.closest("[aria-hidden=true], canvas, svg, script, style, noscript, dialog:not([open]), [popover]:not(:popover-open)")) continue;
                const cs = getComputedStyle(padre);
                if (cs.visibility === "hidden" || Number(cs.opacity) === 0 || !padre.getClientRects().length) continue;
                if (deslizables) {
                    let desliza = false;
                    for (let a: HTMLElement | null = padre; a && a !== document.body; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { desliza = true; break; }
                    if (desliza) continue;
                }
                // Lo que de verdad se ve: si una caja propia lo recorta (texto solo para lector de pantalla, puntos suspensivos), no
                // es un corte del borde. Las cajas del ancho de la pantalla (html, body, .viva) sí cuentan: recortan justo en el borde.
                let oculto = false;
                const recortes: DOMRect[] = [];
                for (let a: HTMLElement | null = padre; a && a !== document.body; a = a.parentElement) {
                    const ca = getComputedStyle(a);
                    if (ca.clipPath !== "none") { oculto = true; break; }
                    if (ca.overflowX === "visible") continue;
                    const b = a.getBoundingClientRect();
                    if (b.left <= 1 && b.right >= innerWidth - 1) continue;
                    recortes.push(b);
                }
                if (oculto) continue;
                const rango = document.createRange(); rango.selectNodeContents(n);
                for (const r of rango.getClientRects()) {
                    let izq = r.left, der = r.right;
                    for (const b of recortes) { izq = Math.max(izq, b.left); der = Math.min(der, b.right); }
                    if (der - izq <= 1 || r.bottom < 0 || r.top > innerHeight || (der <= innerWidth + 1 && izq >= -1)) continue;
                    vistos.add(`texto «${n.textContent!.trim().slice(0, 30)}» [${Math.round(izq)}→${Math.round(der)}]`);
                }
            }
        }
        return [...vistos];
    }, deslizables);
}

for (const ancho of [240, 258, 280, 320, 360, 390]) {
    test(`portada a ${ancho} px: nada cortado a los lados`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
        const page = await ctx.newPage();
        await page.goto("/", { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        expect(await cortes(page)).toEqual([]);
        await ctx.close();
    });
}

// Ni cortado ni partido: en tres columnas iguales «Herramientas» se partía con guion a 390 px («Herramien-tas»).
for (const ancho of [258, 300, 320, 360, 390]) {
    test(`proyectos a ${ancho} px: cada nombre va entero en una línea`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
        const page = await ctx.newPage();
        await page.goto("/", { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const lineas = await page.locator("#proyectos [role=tablist] button").evaluateAll((bs) => bs.map((b) => {
            const r = document.createRange(); r.selectNodeContents(b);
            return [b.textContent, new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size] as const;
        }));
        for (const [nombre, n] of lineas) expect(n, nombre!).toBe(1);
        await ctx.close();
    });
}

// Las demás páginas públicas, con la misma regla: las familias del catálogo y los temas del blog tampoco se deslizan.
for (const ruta of ["/servicios", "/servicios/tienda-online", "/servicios/sistemas-internos", "/servicios/herramientas-web", "/herramientas", "/blog", "/sobre-mi", "/herramientas/qr", "/herramientas/sueldo-liquido", "/herramientas/rut", "/herramientas/uf-utm", "/herramientas/boleta-honorarios", "/indice-web-chilena", "/indice-web-chilena/municipalidades", "/indice-web-chilena/municipalidades/municipalidad-de-talca", "/indice-web-chilena/metodologia", "/indice-web-chilena/revisa-tu-sitio"]) {
    for (const ancho of [258, 360]) {
        test(`${ruta} a ${ancho} px: nada cortado a los lados`, async ({ browser }) => {
            const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
            const page = await ctx.newPage();
            await page.goto(ruta, { waitUntil: "load" });
            await page.evaluate(() => document.fonts.ready);
            expect(await cortes(page)).toEqual([]);
            await ctx.close();
        });
    }
}
