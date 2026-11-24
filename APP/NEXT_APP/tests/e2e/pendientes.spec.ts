import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DEFAULT_TOOL_REGISTRY, getDefaultPublicToolCatalog } from "../../src/lib/tool-registry";
import { crearLectorRanking } from "../../src/lib/tool-destacadas";
import { claveUsoIp, ipParaUso } from "../../src/lib/ip-uso";
import { coincide } from "../../src/components/tools/buscar-herramientas";
import { radiosAnillo } from "../../src/modules/materia/anillo";

/** Los pendientes de las revisiones del 21-11 (catálogo, ronda 1 y ronda 2) y el anillo del contacto. */
const leer = (ruta: string) => readFileSync(ruta, "utf8");
const NOMBRE = new Map(DEFAULT_TOOL_REGISTRY.map((t) => [t.slug, t.name]));

test.describe("sin navegador", () => {
    test("el anillo del contacto es un círculo en el celular (antes, un huevo de 179 × 346) y no cambia en el PC", () => {
        const cel = radiosAnillo(390, 844);
        expect(cel.rx).toBe(cel.ry);
        expect(radiosAnillo(1440, 900)).toEqual({ rx: 640, ry: 350 });
        const tableta = radiosAnillo(700, 900);
        expect(tableta.ry).toBeLessThanOrEqual(tableta.rx);
    });

    test("ranking: las consultas simultáneas comparten una lectura y un fallo no se repite en cada visita", async () => {
        let lecturas = 0;
        let falla = true;
        const lector = crearLectorRanking(async () => { lecturas++; await new Promise((r) => setTimeout(r, 20)); if (falla) throw new Error("sin base"); return [{ slug: "json", sesiones: 9 }]; }, { vigencia: 60_000, espera: 60_000 });
        expect(await Promise.all([lector(), lector(), lector()])).toEqual([[], [], []]);
        expect(lecturas).toBe(1);
        falla = false;
        expect(await lector()).toEqual([]); // dentro de la espera tras el fallo: no vuelve a consultar
        expect(lecturas).toBe(1);
        const bien = crearLectorRanking(async () => { lecturas++; return [{ slug: "json", sesiones: 9 }]; }, { vigencia: 60_000, espera: 0 });
        await bien(); await bien();
        expect(lecturas).toBe(2);
    });

    test("ranking: sin LIMIT antes de filtrar las visibles y con desempate estable", () => {
        const sql = leer("src/lib/tool-ranking.server.ts");
        expect(sql).not.toMatch(/LIMIT\s+6/);
        expect(sql).toContain("ORDER BY sesiones DESC, t.slug");
    });

    test("regex con IA guarda la IP con hash (como el resto), no la IP", () => {
        expect(ipParaUso("2001:db8:1:2:aaaa::1")).toBe(ipParaUso("2001:db8:1:2:bbbb::9"));
        expect(ipParaUso("203.0.113.7")).toMatch(/^[0-9a-f]{16}$/);
        expect(ipParaUso("203.0.113.7")).not.toContain("203");
        expect(claveUsoIp("203.0.113.7")).toBe("203.0.113.7");
        const ruta = leer("src/app/api/tools/regex-ai/route.ts");
        expect(ruta).not.toMatch(/ip:\s*ip\b/);
        // Tampoco en el registro del límite de usos (RateLimitEntry), escrito abreviado: metadata: { ip, … }.
        expect(ruta).not.toMatch(/metadata:\s*\{\s*ip\s*[,}]/);
        expect((ruta.match(/ip: ipParaUso\(ip\)/g) ?? []).length).toBe(4); // tres en ToolUsage y una en RateLimitEntry
    });

    test("resembrar no pisa lo editado en el panel y no queda la semilla vieja de 28", () => {
        expect(leer("prisma/seed.ts")).toMatch(/prisma\.tool\.upsert\(\{\s*where: \{ slug: tool\.slug \},\s*update: \{\},/);
        expect(existsSync("scripts/seed-new-tools.ts")).toBe(false);
    });

    test("buscar «tester» sigue encontrando el probador de regex (su nombre de antes)", () => {
        const regex = getDefaultPublicToolCatalog().find((t) => t.slug === "regex")!;
        expect(coincide(regex, "tester")).toBe(true);
        expect(coincide(regex, "regex tester")).toBe(true);
    });

    test("la página de herramienta bloqueada usa el nombre del catálogo y títulos en español correcto", () => {
        for (const slug of readdirSync("src/app/herramientas", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
            const ruta = `src/app/herramientas/${slug}/page.tsx`;
            if (!existsSync(ruta)) continue;
            const m = leer(ruta).match(/toolName \|\| "([^"]+)"/);
            if (m) expect(m[1], slug).toBe(NOMBRE.get(slug));
        }
        expect(leer("src/components/tools/ImageTransformStudio.tsx")).not.toContain("toolName || config.title");
        const bloqueada = leer("src/components/tools/ToolAccessBlocked.tsx");
        for (const viejo of ["Herramienta en Mantenimiento", "Acceso Restringido", "Acceso Bloqueado", "No Disponible", "Iniciar Sesión", "Volver a herramientas"]) expect(bloqueada).not.toContain(viejo);
    });

    test("sin código muerto: el campo related del SEO y la rama «pagina» de la portada", async () => {
        const { TOOLS_SEO } = await import("../../src/lib/seo/tools-content");
        for (const [slug, s] of Object.entries(TOOLS_SEO)) expect("related" in s, slug).toBe(false);
        expect(leer("src/modules/landing/viva/Herramientas.tsx")).not.toContain("pagina");
    });

    test("NEXT_BUILD_CPUS inválido no deja «NaN» en la configuración", async () => {
        process.env.NEXT_BUILD_CPUS = "muchos";
        const { default: conf } = await import(`../../next.config.mjs?cpus=${Date.now()}`);
        expect(conf.experimental?.cpus).toBeUndefined();
        process.env.NEXT_BUILD_CPUS = "3";
        const { default: tres } = await import(`../../next.config.mjs?cpus3=${Date.now()}`);
        expect(tres.experimental?.cpus).toBe(3);
        delete process.env.NEXT_BUILD_CPUS;
    });
});

test.describe("en la página", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    /** Tailwind 4 da los colores en oklch(): se pasan a RGB pintándolos en un canvas de 1 px. */
    const EN_RGB = (e: Element) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = getComputedStyle(e).color; c.fillRect(0, 0, 1, 1); const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`; };
    const neon = (c: string) => { const [r, g, b] = (c.match(/[\d.]+/g) ?? []).map(Number); return g - Math.max(r, b) > 60; };

    test("IVA: el ícono de copiado y los de «Agregar/Quitar IVA» usan los colores del sitio", async ({ page }) => {
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.goto("/herramientas/impuestos");
        const copiar = page.getByRole("button", { name: /Copiar neto/i });
        await copiar.click();
        await expect(copiar.locator("path[d='M5 13l4 4L19 7']")).toBeVisible(); // el visto de «copiado»
        expect(neon(await copiar.evaluate(EN_RGB))).toBe(false);
        const iconos = await page.locator("#tools-content h3 svg").evaluateAll((s, f) => s.map((e) => new Function(`return (${f})`)()(e)), EN_RGB.toString());
        expect(iconos.length).toBeGreaterThan(0);
        for (const c of iconos) expect(neon(c), c).toBe(false);
    });

    test("regex: el campo dice que una expresión que se cuelga se detiene sola (ReDoS)", async ({ page }) => {
        await page.goto("/herramientas/regex");
        await expect(page.locator("#regex-patron")).toHaveAccessibleDescription(/ReDoS/);
    });

    test("ascii: sin contenedores vacíos sobrantes antes de subir una imagen", async ({ page }) => {
        await page.goto("/herramientas/ascii");
        await page.getByRole("heading", { level: 1 }).waitFor();
        expect(await page.locator("#tools-content div.justify-end:empty").count()).toBe(0);
    });

    test("catálogo: títulos con su tamaño propio, foco de las tarjetas sin recortar y orden de títulos", async ({ page }) => {
        await page.goto("/herramientas");
        const h1 = page.locator("#ht-cab-titulo");
        await expect(h1).toHaveCSS("font-size", "104px");
        await expect(page.locator("#ht-dest-t")).toHaveCSS("font-size", "15px");
        await expect(page.locator("section.ht-destacadas")).toHaveCSS("overflow-x", "visible");
        const h2 = await page.locator("#catalogo h2").allTextContents();
        expect(h2.indexOf("Todas las herramientas")).toBeGreaterThan(h2.findIndex((t) => /Destacadas|Las más usadas/.test(t)));
    });
});
