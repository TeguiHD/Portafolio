import { expect, test } from "@playwright/test";
import { alEscribir, numeroDeTexto, textoDeNumero, type OpcionesNumero } from "../../src/lib/tools/numeros";

/**
 * Separador de miles al escribir (23-11-2026): todo campo donde se escribe un número lo muestra a la chilena mientras
 * se escribe (1.234.567; 1.234,56 donde hay decimales), con el cursor junto al dígito que se tocó.
 * Diseño: docs/superpowers/specs/2026-11-23-separador-miles-design.md
 */
const ENTERO: OpcionesNumero = { decimales: 0 };
const DOS: OpcionesNumero = { decimales: 2 };

test.describe("campo numérico: funciones", () => {
    test("escribir de corrido agrupa de a tres", () => {
        expect(alEscribir("", "1234567", 7, ENTERO)).toEqual({ texto: "1.234.567", cursor: 9 });
    });

    test("escribir en medio deja el cursor tras el dígito escrito", () => {
        expect(alEscribir("1.234.567", "1.2384.567", 5, ENTERO)).toEqual({ texto: "12.384.567", cursor: 5 });
    });

    test("borrar un dígito reagrupa sin mover el cursor de su dígito", () => {
        expect(alEscribir("1.234.567", "1.24.567", 3, ENTERO)).toEqual({ texto: "124.567", cursor: 2 });
    });

    test("pegar con puntos, signo peso y espacios da el mismo número", () => {
        expect(alEscribir("", "$ 1.234.567", 11, ENTERO).texto).toBe("1.234.567");
        expect(alEscribir("", "1234567", 7, ENTERO).texto).toBe("1.234.567");
    });

    test("pegar un decimal con punto (planilla en inglés) solo es decimal donde hay decimales", () => {
        expect(alEscribir("", "39512.34", 8, DOS).texto).toBe("39.512,34");
        expect(alEscribir("", "39512.34", 8, ENTERO).texto).toBe("3.951.234");
        // Un punto seguido de tres dígitos es de miles, también con decimales.
        expect(alEscribir("", "1.234", 5, DOS).texto).toBe("1.234");
        expect(alEscribir("", "1.234,56", 8, DOS).texto).toBe("1.234,56");
    });

    test("un punto escrito al final, donde hay decimales, es la coma", () => {
        expect(alEscribir("39.512", "39.512.", 7, DOS)).toEqual({ texto: "39.512,", cursor: 7 });
        // En un campo sin decimales, el punto no hace nada.
        expect(alEscribir("39.512", "39.512.", 7, ENTERO)).toEqual({ texto: "39.512", cursor: 6 });
    });

    test("no pasa del tope de decimales", () => {
        expect(alEscribir("1,25", "1,257", 5, DOS)).toEqual({ texto: "1,25", cursor: 4 });
        expect(alEscribir("1", "1,", 2, ENTERO).texto).toBe("1");
    });

    test("ceros a la izquierda", () => {
        expect(alEscribir("0", "05", 2, ENTERO)).toEqual({ texto: "5", cursor: 1 });
        expect(alEscribir("", "0,5", 3, DOS).texto).toBe("0,5");
        expect(alEscribir("", ",5", 2, DOS).texto).toBe("0,5");
        expect(alEscribir("", "0", 1, ENTERO).texto).toBe("0");
    });

    test("no pasa de 13 dígitos enteros", () => {
        expect(alEscribir("", "12345678901234", 14, ENTERO).texto).toBe("1.234.567.890.123");
    });

    test("el signo menos solo donde se permite", () => {
        expect(alEscribir("", "-1500", 5, { decimales: 0, negativos: true }).texto).toBe("-1.500");
        expect(alEscribir("", "-1500", 5, ENTERO).texto).toBe("1.500");
        expect(alEscribir("", "-", 1, { decimales: 0, negativos: true }).texto).toBe("-");
    });

    test("leer el texto visible", () => {
        expect(numeroDeTexto("1.234.567,5")).toBe(1234567.5);
        expect(numeroDeTexto("39.512,")).toBe(39512);
        expect(numeroDeTexto("-1.500")).toBe(-1500);
        for (const vacio of ["", "-", ","]) expect(numeroDeTexto(vacio), vacio).toBeNull();
    });

    test("de número a texto y de vuelta, sin perder nada", () => {
        const casos: [number, OpcionesNumero, string][] = [
            [0, ENTERO, "0"], [7, ENTERO, "7"], [1000, ENTERO, "1.000"], [1234567.89, DOS, "1.234.567,89"],
            [0.00012345, { decimales: 8 }, "0,00012345"], [-5, { decimales: 0, negativos: true }, "-5"],
        ];
        for (const [n, o, texto] of casos) {
            expect(textoDeNumero(n, o)).toBe(texto);
            expect(numeroDeTexto(textoDeNumero(n, o))).toBe(n);
        }
        expect(textoDeNumero(null, ENTERO)).toBe("");
    });
});
