import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { claveLimiteProxy, esPrimerExceso, reglaLimite } from "../../src/lib/limite-proxy";

/**
 * El límite del proxy contaba /api/admin con el mismo contador que toda la API (visitas, finanzas…) pero con el tope de
 * admin (50/min): a ritmo normal el panel sumaba 42 en su peor minuto, y cada pedido rechazado era una falta: tres
 * rechazos seguidos bloqueaban todo el panel 15 min (25-11-2026). Lo mismo en /api/auth: consultar la sesión (30/min)
 * gastaba el cupo de entrar (10/min) y el de pedir otra clave (3/h).
 */
const IP = "203.0.113.7";

test.describe("sin navegador: límite de pedidos del proxy", () => {
    test("cada regla tiene su propio tope y su propia ventana", () => {
        expect(reglaLimite("/api/admin/notifications")).toMatchObject({ categoria: "admin", cuenta: "admin", limite: 50, ventanaMs: 60_000 });
        expect(reglaLimite("/api/auth/session")).toMatchObject({ categoria: "auth", cuenta: "auth-sesion", limite: 30, ventanaMs: 60_000 });
        expect(reglaLimite("/api/auth/callback/credentials")).toMatchObject({ categoria: "auth", cuenta: "auth", limite: 10, ventanaMs: 60_000 });
        expect(reglaLimite("/api/auth/password-reset/request")).toMatchObject({ categoria: "auth", cuenta: "auth-clave", limite: 3, ventanaMs: 3_600_000 });
        expect(reglaLimite("/api/finance/ocr/scan")).toMatchObject({ categoria: "finance", cuenta: "ocr", limite: 10 });
        expect(reglaLimite("/api/finance/accounts")).toMatchObject({ categoria: "api", cuenta: "finance", limite: 100 });
        expect(reglaLimite("/api/analytics")).toMatchObject({ categoria: "api", cuenta: "api", limite: 100 });
    });

    test("dos rutas con distinto tope o ventana nunca comparten contador", () => {
        const rutas = ["/api/admin/x", "/api/auth/session", "/api/auth/csrf", "/api/auth/signout", "/api/auth/callback/credentials", "/api/auth/password-reset/request",
            "/api/finance/ocr/x", "/api/finance/accounts", "/api/analytics", "/api/tools/regex-ai", "/blog"];
        const porCuenta = new Map<string, string>();
        for (const r of rutas) {
            const g = reglaLimite(r), firma = `${g.limite}/${g.ventanaMs}`, clave = claveLimiteProxy(IP, r);
            if (porCuenta.has(clave)) expect(porCuenta.get(clave), `${r} comparte ${clave}`).toBe(firma);
            porCuenta.set(clave, firma);
        }
        expect(claveLimiteProxy(IP, "/api/admin/x")).not.toBe(claveLimiteProxy(IP, "/api/analytics"));
        expect(claveLimiteProxy(IP, "/api/auth/session")).not.toBe(claveLimiteProxy(IP, "/api/auth/callback/credentials"));
    });

    test("una falta es un minuto excedido: solo el primer pedido sobre el tope la suma", () => {
        expect(esPrimerExceso(50, 50)).toBe(false);
        expect(esPrimerExceso(51, 50)).toBe(true);
        expect(esPrimerExceso(52, 50)).toBe(false);
        expect(esPrimerExceso(200, 50)).toBe(false);
    });

    test("el proxy usa la regla y la falta por minuto (con Redis y en memoria)", () => {
        const proxy = readFileSync("src/proxy.ts", "utf8");
        expect(proxy).toContain("reglaLimite(pathname)");
        expect(proxy.match(/esPrimerExceso\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
        expect(proxy).not.toMatch(/limit = 50\s+\/\/ 50 admin requests per minute/);
    });
});
