import { test, expect, type Page } from "@playwright/test";

const SITE_URL = "https://nicoholas.dev";

/** Lee todos los bloques JSON-LD de la página y los devuelve parseados. */
async function readJsonLd(page: Page): Promise<Record<string, unknown>[]> {
    const blocks = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
    return blocks.map((raw) => JSON.parse(raw) as Record<string, unknown>);
}

function typesOf(schemas: Record<string, unknown>[]): string[] {
    return schemas.map((s) => String(s["@type"]));
}

test.describe("Datos estructurados", () => {
    test("la home emite Person, WebSite y ProfessionalService", async ({ page }) => {
        await page.goto("/");
        const types = typesOf(await readJsonLd(page));
        expect(types).toContain("Person");
        expect(types).toContain("WebSite");
        expect(types).toContain("ProfessionalService");
    });

    test("ninguna página emite el BreadcrumbList global falso", async ({ page }) => {
        // El schema viejo declaraba Inicio > Herramientas > Blog en todas las
        // páginas: no es una jerarquía, y aparecía incluso en la home.
        await page.goto("/");
        const schemas = await readJsonLd(page);
        const breadcrumbs = schemas.filter((s) => s["@type"] === "BreadcrumbList");
        expect(breadcrumbs).toHaveLength(0);
    });

    test("todo bloque JSON-LD lleva nonce de CSP", async ({ page }) => {
        await page.goto("/");
        // Chrome/Firefox ocultan el atributo "nonce" a propósito: getAttribute("nonce")
        // y outerHTML siempre devuelven "" una vez que el elemento está en el DOM, para
        // que un XSS no pueda robar el nonce leyendo el HTML. El valor real solo vive en
        // la propiedad IDL `.nonce`. La CSP del navegador ya validó el nonce contra la
        // cabecera *antes* de ese ocultamiento, así que leer `.nonce` no debilita la
        // aserción: verifica exactamente lo que el brief pedía, con la única API del
        // DOM que puede verlo.
        const nonces = await page
            .locator('script[type="application/ld+json"]')
            .evaluateAll((nodes) => nodes.map((n) => (n as HTMLScriptElement).nonce));
        expect(nonces.length).toBeGreaterThan(0);
        for (const nonce of nonces) {
            expect(nonce, "un bloque JSON-LD sin nonce lo bloquea la CSP").toBeTruthy();
        }

        // Regression guard: src/proxy.ts alguna vez borró la cabecera interna
        // x-middleware-request-x-nonce creyendo que así evitaba filtrar el nonce
        // al cliente. En realidad esa cabecera es el transporte interno de Next
        // para overrides de request headers, nunca llega al navegador — borrarla
        // solo rompía getNonce(), y todo bloque quedaba con nonce="". Un nonce
        // no vacío en cada bloque es la prueba de que la cabecera sobrevive.
        for (const nonce of nonces) {
            expect(typeof nonce).toBe("string");
            expect((nonce as string).length).toBeGreaterThan(0);
        }

        // Los tres bloques se emiten en el mismo request (JsonLd llama a
        // getNonce() una sola vez, cacheado por React), así que deben compartir
        // idéntico valor. Un mismatch entre bloques indicaría que el cache de
        // getNonce() se rompió y cada bloque está leyendo un nonce distinto.
        const uniqueNonces = new Set(nonces);
        expect(
            uniqueNonces.size,
            "todos los bloques de una misma página deben compartir el nonce de esa request"
        ).toBe(1);
    });

    test("todo bloque JSON-LD es JSON válido con @context de schema.org", async ({ page }) => {
        await page.goto("/");
        const schemas = await readJsonLd(page); // JSON.parse lanza si es inválido
        expect(schemas.length).toBeGreaterThan(0);
        for (const schema of schemas) {
            expect(schema["@context"]).toBe("https://schema.org");
            expect(schema["@type"]).toBeTruthy();
        }
    });

    test("el Person schema apunta a la página de autor", async ({ page }) => {
        await page.goto("/");
        const person = (await readJsonLd(page)).find((s) => s["@type"] === "Person");
        expect(person).toBeTruthy();
        expect(person!.url).toBe(`${SITE_URL}/sobre-mi`);
        expect(Array.isArray(person!.sameAs)).toBe(true);
    });
});
