import { test, expect } from "@playwright/test";

const MODEL = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
// Concesiones que existen SOLO para el visor 3D. La línea base ya incluye
// fonts.gstatic.com para las tipografías, así que se comprueba www.gstatic.com.
const SOLO_VISOR = ["wasm-unsafe-eval", "modelviewer.dev", "https://www.gstatic.com"];

const csp = (headers: Record<string, string>) => headers["content-security-policy"] ?? "";

/**
 * La CSP del visor 3D solo puede relajarse en sus propias rutas. Este archivo
 * fija ese límite: cualquier cambio que lo extienda al resto del sitio falla.
 *
 * En desarrollo frame-ancestors es 'self' en todo el sitio, así que aquí se
 * comprueba que nunca sea más permisivo que 'self' y que el aislamiento del
 * iframe se apoye además en X-Frame-Options, que no depende del entorno.
 */
test("el resto del sitio no recibe ninguna concesión del visor", async ({ request }) => {
    for (const path of ["/", "/herramientas", "/herramientas/qr"]) {
        const res = await request.get(path);
        const value = csp(res.headers());
        for (const grant of SOLO_VISOR) expect(value, `${path} → ${grant}`).not.toContain(grant);
        expect(res.headers()["x-frame-options"], path).toBe("DENY");
    }
});

test("el visor abre su origen solo con un modelo validado", async ({ request }) => {
    const withModel = await request.get(`/ar/preview?glb=${encodeURIComponent(MODEL)}`);
    const value = csp(withModel.headers());
    for (const grant of SOLO_VISOR) expect(value, grant).toContain(grant);
    expect(withModel.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    // Nunca más permisivo que el propio origen.
    expect(value).toMatch(/frame-ancestors '(self|none)'/);
    expect(value).not.toContain("frame-ancestors *");

    // Sin modelo no se concede nada extra.
    const bare = csp((await request.get("/ar/preview")).headers());
    for (const grant of SOLO_VISOR) expect(bare, `sin modelo → ${grant}`).not.toContain(grant);
});

test("una URL de modelo no válida no altera la CSP", async ({ request }) => {
    const malas = [
        "javascript:alert(1)",
        "http://inseguro.example/m.glb",
        "https://user:pass@x.example/m.glb",
        "https://x.example/m.exe",
    ];
    for (const bad of malas) {
        const value = csp((await request.get(`/ar/preview?glb=${encodeURIComponent(bad)}`)).headers());
        expect(value, bad).not.toContain("javascript:");
        expect(value, bad).not.toContain("inseguro.example");
        expect(value, bad).not.toContain("x.example");
        expect(value, bad).not.toContain("wasm-unsafe-eval");
    }
});
