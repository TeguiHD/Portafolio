import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { crearLectorIndicadores } from "../../src/lib/chile/lector-indicadores";

/**
 * mindicador.cl a ratos tarda hasta 12 s (medido el 24-11-2026): con 4 s de plazo y sin nada guardado, la UF/UTM y el
 * sueldo líquido quedaban en modo manual en producción. El lector no hace esperar a la página, sigue la carga por detrás,
 * guarda lo último bueno (Redis) para después de un reinicio y no reintenta en cada visita mientras la fuente falla.
 */
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BASE = { frescoMs: 60_000, rancioMs: 3_600_000, esperaMs: 30, pausaTrasFalloMs: 200 };

test.describe("sin navegador: lector de indicadores", () => {
    test("con la fuente lenta y nada guardado, la página no espera; la carga sigue y la próxima lectura ya tiene el valor", async () => {
        let cargas = 0;
        const leer = crearLectorIndicadores({ ...BASE, cargar: async () => { cargas++; await dormir(150); return "uf"; } });
        const t0 = Date.now();
        expect(await leer()).toBeNull();
        expect(Date.now() - t0).toBeLessThan(120);
        await dormir(200);
        expect(await leer()).toBe("uf");
        expect(cargas).toBe(1);
    });

    test("lo guardado sirve tras un reinicio aunque la fuente no responda", async () => {
        const leer = crearLectorIndicadores({ ...BASE, cargar: () => new Promise<string>(() => {}), leerGuardado: async () => ({ valor: "guardada", momento: Date.now() - 600_000 }) });
        expect(await leer()).toBe("guardada");
    });

    test("lo guardado más viejo que el plazo de rancio no sirve", async () => {
        const leer = crearLectorIndicadores({ ...BASE, cargar: () => new Promise<string>(() => {}), leerGuardado: async () => ({ valor: "vieja", momento: Date.now() - 2 * BASE.rancioMs }) });
        expect(await leer()).toBeNull();
    });

    test("un valor nuevo se guarda para después de un reinicio", async () => {
        const guardados: unknown[] = [];
        const leer = crearLectorIndicadores({ ...BASE, esperaMs: 500, cargar: async () => "nueva", guardar: async (v) => { guardados.push(v.valor); } });
        expect(await leer()).toBe("nueva");
        await dormir(10);
        expect(guardados).toEqual(["nueva"]);
    });

    test("tras un fallo no vuelve a pedir durante la pausa, y después sí", async () => {
        let cargas = 0;
        const leer = crearLectorIndicadores({ ...BASE, cargar: async () => { cargas++; throw new Error("no responde"); } });
        expect(await leer()).toBeNull();
        expect(await leer()).toBeNull();
        expect(cargas).toBe(1);
        await dormir(250);
        await leer();
        expect(cargas).toBe(2);
    });

    test("un valor fresco no se vuelve a pedir; uno caducado se sirve al tiro y se refresca por detrás", async () => {
        let cargas = 0, ahora = 1_000_000;
        const leer = crearLectorIndicadores({ ...BASE, esperaMs: 500, ahora: () => ahora, cargar: async () => { cargas++; return `v${cargas}`; } });
        expect(await leer()).toBe("v1");
        ahora += 1000;
        expect(await leer()).toBe("v1");
        expect(cargas).toBe(1);
        ahora += BASE.frescoMs;
        expect(await leer()).toBe("v1"); // caducado pero servible: no espera
        await dormir(10);
        expect(await leer()).toBe("v2");
    });

    test("si leer lo guardado se cuelga, no hace esperar a la página", async () => {
        const leer = crearLectorIndicadores({ ...BASE, cargar: () => new Promise<string>(() => {}), leerGuardado: () => new Promise<null>(() => {}) });
        const t0 = Date.now();
        expect(await leer()).toBeNull();
        expect(Date.now() - t0).toBeLessThan(150);
    });

    test("los indicadores del sitio usan el lector, con plazo largo para la fuente y lo último guardado en Redis", () => {
        const codigo = readFileSync("src/lib/chile/indicadores.server.ts", "utf8");
        expect(codigo).toContain("crearLectorIndicadores<Indicadores>(");
        expect(codigo).toMatch(/plazo: 15_000/);
        expect(codigo).toContain("leerGuardado: () => getCached");
    });
});
