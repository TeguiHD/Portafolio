import { expect, test } from "@playwright/test";
import { normalizarOrigen, ORIGENES } from "../../src/lib/contacto-origen";

/**
 * Base para que las IA encuentren y nombren al autor (informe «GEO para marca personal en Chile», 22-11-2026):
 * robots.txt abierto en lo público a buscadores y entrenadores de IA, la entidad con su LinkedIn canónico, /sobre-mi como
 * ProfilePage que responde «quién es» en el HTML del servidor, y el contacto que pregunta cómo llegó la persona.
 */
const LINKEDIN = "https://www.linkedin.com/in/nicoholas-lopetegui/";

test.describe("sin navegador", () => {
    test("el origen del contacto solo acepta las opciones del formulario", () => {
        expect(ORIGENES.map((o) => o.valor)).toContain("ia");
        expect(normalizarOrigen("ia")).toBe("ia");
        expect(normalizarOrigen("linkedin")).toBe("linkedin");
        for (const malo of ["IA", "<script>", "", 3, null, undefined, { valor: "ia" }]) expect(normalizarOrigen(malo)).toBeNull();
    });
});

test("robots.txt: lo público abierto a los buscadores y entrenadores de IA, lo privado cerrado", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    for (const bot of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended"]) {
        expect(txt, bot).toMatch(new RegExp(`User-Agent: ${bot}\\nAllow: /\\nDisallow: /admin/`));
    }
});

test("LinkedIn en su forma canónica en la entidad, /sobre-mi y llms.txt", async ({ request }) => {
    for (const ruta of ["/", "/sobre-mi", "/llms.txt"]) {
        const texto = await (await request.get(ruta)).text();
        expect(texto, ruta).toContain(LINKEDIN);
        expect(texto, ruta).not.toMatch(/https:\/\/linkedin\.com\/in\//);
    }
});

test("/sobre-mi es una ProfilePage cuya entidad principal es la persona", async ({ request }) => {
    const html = await (await request.get("/sobre-mi")).text();
    const bloques = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1]!)].flat());
    const perfil = bloques.find((b) => b["@type"] === "ProfilePage");
    expect(perfil).toBeTruthy();
    expect(perfil.mainEntity["@id"]).toMatch(/\/#person$/);
    expect(perfil.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
});

test("/sobre-mi responde quién es en su primer párrafo, sin esperar al JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/sobre-mi");
    const inicio = (await page.locator("#inicio").innerText()).toLowerCase();
    for (const dato of ["desarrollador full stack", "chile", "tiendas en línea", "sistemas internos", "herramientas web"]) expect(inicio, dato).toContain(dato);
    await ctx.close();
});
