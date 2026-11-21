import { expect, test } from "@playwright/test";

/** Tanda 3 (19-11-2026): operación de la plataforma. */
test.describe("Plataforma", () => {
    test("salud: /api/health prueba la base y no se cachea", async ({ request }) => {
        const r = await request.get("/api/health");
        expect(r.status()).toBe(200);
        expect(r.headers()["cache-control"]).toContain("no-store");
        const cuerpo = await r.json();
        expect(cuerpo).toMatchObject({ ok: true, base: true });
        expect(typeof cuerpo.redis).toBe("boolean");
    });

    test("cabeceras: filtro XSS viejo apagado y la CSP no abre APIs que el navegador no usa", async ({ request }) => {
        const r = await request.get("/");
        const h = r.headers();
        // Detrás de Cloudflare, su transformación «Add security headers» pisa esta cabecera; el origen manda 0.
        if (!h["cf-ray"]) expect(h["x-xss-protection"]).toBe("0");
        expect(h["content-security-policy"]).not.toContain("openrouter");
        expect(h["content-security-policy"]).not.toContain("frankfurter");
        expect(h["cache-control"]).toContain("private");
    });

    test("service worker: versión con poda de cachés", async ({ request }) => {
        const r = await request.get("/sw.js");
        expect(r.status()).toBe(200);
        const js = await r.text();
        expect(js).toContain("portfolio-static-v7");
        expect(js).toContain("podar(STATIC_CACHE, MAX_STATIC)");
    });
});
