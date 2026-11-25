import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { crearCategoriasBase } from "../../src/lib/finanzas/categorias-base";

/**
 * Las categorías de siempre se creaban al hacer clic en «Crea tu primera cuenta» (24-11-2026): con clic medio, o
 * llegando por el menú, la cuenta quedaba sin categorías. Ahora las crea el servidor al guardar la primera cuenta.
 */
type Donde = { OR: ({ userId: string } | { userId: null })[] };
/** `propias`: las de la persona; `sistema`: las globales (userId null), que todos ven. */
function bdFalsa(propias: number, sistema = 0) {
    const creadas: { userId: string; name: string; type: string }[][] = [];
    return {
        creadas,
        financeCategory: {
            count: async ({ where }: { where: Donde }) => where.OR.reduce((n, o) => n + (o.userId === null ? sistema : o.userId ? propias : 0), 0),
            createMany: async ({ data }: { data: { userId: string; name: string; type: string }[] }) => { creadas.push(data); return { count: data.length }; },
        },
    };
}

test.describe("sin navegador: categorías de siempre", () => {
    test("sin categorías, crea las 12 de siempre (8 de gasto y 4 de ingreso) para esa persona", async () => {
        const bd = bdFalsa(0);
        expect(await crearCategoriasBase(bd, "u1")).toBe(12);
        expect(bd.creadas).toHaveLength(1);
        const filas = bd.creadas[0]!;
        expect(filas.every((f) => f.userId === "u1")).toBe(true);
        expect(filas.filter((f) => f.type === "EXPENSE")).toHaveLength(8);
        expect(filas.filter((f) => f.type === "INCOME")).toHaveLength(4);
        expect(filas.map((f) => f.name)).toContain("Alimentación");
    });

    test("si ya tiene categorías, no crea ninguna", async () => {
        const bd = bdFalsa(3);
        expect(await crearCategoriasBase(bd, "u1")).toBe(0);
        expect(bd.creadas).toHaveLength(0);
    });

    // Producción tiene 23 de sistema (Alimentación, Transporte, Salario…): crear las 12 encima las repetía en el selector.
    test("si ve categorías de sistema, no crea ninguna (no repite nombres)", async () => {
        const bd = bdFalsa(0, 23);
        expect(await crearCategoriasBase(bd, "u1")).toBe(0);
        expect(bd.creadas).toHaveLength(0);
    });

    test("las crea el servidor al guardar la primera cuenta; el clic del estado vacío ya no las pide", () => {
        expect(readFileSync("src/app/api/finance/accounts/route.ts", "utf8")).toContain("crearCategoriasBase(");
        expect(readFileSync("src/modules/finance/components/FinanceDashboardClean.tsx", "utf8")).not.toContain("onboarding/complete");
        expect(existsSync("src/app/api/finance/onboarding/complete/route.ts")).toBe(false);
    });
});
