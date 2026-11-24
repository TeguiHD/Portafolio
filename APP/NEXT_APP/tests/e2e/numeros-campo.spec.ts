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

    test("pegar un decimal con punto (planilla en inglés): es decimal, y en un campo de pesos se quitan los decimales", () => {
        expect(alEscribir("", "39512.34", 8, DOS).texto).toBe("39.512,34");
        // Antes daba 3.951.234: «150000.00» copiado de una planilla quedaba cien veces más grande.
        expect(alEscribir("", "39512.34", 8, ENTERO).texto).toBe("39.512");
        expect(alEscribir("", "150000.00", 9, ENTERO).texto).toBe("150.000");
        // Con un cero adelante no puede ser de miles; con miles y decimales, el último separador es el decimal.
        expect(alEscribir("", "0.005", 5, { decimales: 8 }).texto).toBe("0,005");
        expect(alEscribir("", "1,234.56", 8, DOS).texto).toBe("1.234,56");
        expect(alEscribir("", "1,234,567", 9, ENTERO).texto).toBe("1.234.567");
        // Un punto seguido de tres dígitos es de miles, también con decimales.
        expect(alEscribir("", "1.234", 5, DOS).texto).toBe("1.234");
        expect(alEscribir("", "1.234,56", 8, DOS).texto).toBe("1.234,56");
    });

    test("un punto escrito al final, donde hay decimales, es la coma", () => {
        expect(alEscribir("39.512", "39.512.", 7, DOS)).toEqual({ texto: "39.512,", cursor: 7, comaProvisional: true });
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

    test("reemplazar todo el campo (fill, autocompletar, pegar sobre una selección) no lee un pedazo como decimal", () => {
        // Sin saber qué se reemplazó: el sufijo intacto es lo que queda después del cursor.
        expect(alEscribir("10.000", "1.190.000", 9, DOS).texto).toBe("1.190.000");
        // Sabiéndolo (beforeinput): se normaliza exactamente lo que entró.
        expect(alEscribir("10.000", "1.190.000", 9, DOS, { cambio: { inicio: 0, fin: 6, insertado: "1.190.000" } }).texto).toBe("1.190.000");
        expect(alEscribir("12.000", "12.5", 4, DOS, { cambio: { inicio: 0, fin: 6, insertado: "12.5" } }).texto).toBe("12,5");
        expect(alEscribir("1.000", "123.000", 3, ENTERO, { cambio: { inicio: 1, fin: 1, insertado: "23" } })).toEqual({ texto: "123.000", cursor: 3 });
        expect(alEscribir("39.512", "39.512.", 7, DOS, { cambio: { inicio: 6, fin: 6, insertado: "." } }).texto).toBe("39.512,");
    });

    /** Escribe tecla por tecla al final, como en el campo: con el cambio anotado y la coma provisional de vuelta. */
    function teclear(teclas: string, o: OpcionesNumero): string {
        let texto = "", provisional = false;
        for (const t of teclas) {
            const r = alEscribir(texto, texto + t, texto.length + 1, o, { cambio: { inicio: texto.length, fin: texto.length, insertado: t }, comaProvisional: provisional });
            texto = r.texto;
            provisional = !!r.comaProvisional;
        }
        return texto;
    }

    test("los puntos de miles escritos a mano siguen siendo de miles, también donde hay decimales", () => {
        // La revisión del 23-11: «1.190.000» tecleado en el IVA quedaba en 1,19 y «150.000» en un presupuesto, en 150.
        for (const t of ["1.190.000", "150.000", "12.990", "25.000"]) expect(teclear(t, DOS), t).toBe(t);
        expect(teclear("39.643,59", DOS)).toBe("39.643,59");
        expect(teclear("1.234.567,89", DOS)).toBe("1.234.567,89");
        expect(teclear("1.190.000", ENTERO)).toBe("1.190.000");
        // Y el punto como decimal (teclado en inglés) sigue sirviendo cuando no puede ser de miles.
        expect(teclear("39512.34", DOS)).toBe("39.512,34");
        expect(teclear("2.5", DOS)).toBe("2,5");
        expect(teclear("0.005", { decimales: 8 })).toBe("0,005");
    });

    test("en el tope de dígitos, la tecla no entra y el número no cambia", () => {
        expect(alEscribir("1,25", "1,925", 3, DOS, { cambio: { inicio: 2, fin: 2, insertado: "9" } })).toEqual({ texto: "1,25", cursor: 2 });
        const trece = "1.234.567.890.123";
        expect(alEscribir(trece, `19${trece.slice(1)}`, 2, ENTERO, { cambio: { inicio: 1, fin: 1, insertado: "9" } })).toEqual({ texto: trece, cursor: 1 });
    });

    test("borrar un punto de miles (teclado de Android, sin tecla identificada) borra el dígito de al lado", () => {
        expect(alEscribir("1.234", "1234", 1, ENTERO)).toEqual({ texto: "234", cursor: 0 });
        expect(alEscribir("1.234", "1234", 1, ENTERO, { borrado: "adelante" })).toEqual({ texto: "134", cursor: 1 });
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

test.describe("campo numérico: en las herramientas", () => {
    const cursor = (campo: import("@playwright/test").Locator) => campo.evaluate((el: HTMLInputElement) => el.selectionStart);
    const ponerCursor = (campo: import("@playwright/test").Locator, n: number) => campo.evaluate((el: HTMLInputElement, i) => el.setSelectionRange(i, i), n);

    test("sueldo: escribir pone los puntos de miles", async ({ page }) => {
        await page.goto("/herramientas/sueldo-liquido");
        const campo = page.getByLabel(/Sueldo bruto mensual/);
        await campo.fill("");
        await campo.pressSequentially("1234567");
        await expect(campo).toHaveValue("1.234.567");
    });

    test("sueldo: escribir en medio deja el cursor tras el dígito escrito", async ({ page }) => {
        await page.goto("/herramientas/sueldo-liquido");
        const campo = page.getByLabel(/Sueldo bruto mensual/);
        await campo.fill("");
        await campo.pressSequentially("1234567");
        await ponerCursor(campo, 3);
        await page.keyboard.type("9");
        await expect(campo).toHaveValue("12.934.567");
        expect(await cursor(campo)).toBe(4);
    });

    test("sueldo: retroceso justo después de un punto borra el dígito de antes", async ({ page }) => {
        await page.goto("/herramientas/sueldo-liquido");
        const campo = page.getByLabel(/Sueldo bruto mensual/);
        await campo.fill("");
        await campo.pressSequentially("1234567");
        await ponerCursor(campo, 6);
        await page.keyboard.press("Backspace");
        await expect(campo).toHaveValue("123.567");
        expect(await cursor(campo)).toBe(3);
    });

    test("IVA: teclear los puntos de miles a mano deja el monto entero (no 1,19)", async ({ page }) => {
        await page.goto("/herramientas/impuestos");
        const campo = page.getByLabel(/Monto neto/);
        await campo.fill("");
        await campo.pressSequentially("1.190.000");
        await expect(campo).toHaveValue("1.190.000");
        await expect(page.locator("body")).toContainText("1.416.100");
    });

    test("UF/UTM: un punto escrito en el monto es la coma decimal", async ({ page }) => {
        await page.goto("/herramientas/uf-utm");
        const campo = page.getByLabel("Monto", { exact: true });
        await campo.fill("");
        await campo.pressSequentially("2.5");
        await expect(campo).toHaveValue("2,5");
    });
});

test.describe("campo numérico: fuente", () => {
    /**
     * Los campos que nunca llevan separador de miles, con cuántos atributos numéricos tiene cada archivo
     * (inputMode="numeric|decimal" y type="number"; una misma etiqueta puede traer los dos). Todo lo demás usa CampoNumero.
     */
    const EXCEPCIONES: Record<string, number> = {
        "app/acceso/page.tsx": 1, // código de acceso (OTP)
        "app/admin/profile/client.tsx": 2, // códigos de la app de autenticación
        "app/herramientas/subredes/page.tsx": 1, // prefijo CIDR
        "app/herramientas/qr/page.tsx": 2, // latitud y longitud
        "components/tools/ImageTransformStudio.tsx": 3, // ancho, alto y lado máximo en píxeles
        "app/admin/gestion-comercial/contratos/contracts-list.tsx": 2, // días de aviso
        "app/admin/gestion-comercial/pagos/registrar-pago.tsx": 4, // cuota número y total de cuotas
        "app/admin/gestion-comercial/pipeline/pipeline-board.tsx": 2, // probabilidad (%)
        "modules/finance/components/RecurringForm.tsx": 2, // día del mes
    };

    test("todo campo numérico usa CampoNumero, salvo los que nunca llevan separador", async () => {
        const { readdirSync, readFileSync } = await import("node:fs");
        const raiz = new URL("../../src/", import.meta.url);
        const hallados: Record<string, number> = {};
        for (const ruta of readdirSync(raiz, { recursive: true }) as string[]) {
            if (!ruta.endsWith(".tsx") || ruta.endsWith("CampoNumero.tsx")) continue;
            const n = (readFileSync(new URL(ruta, raiz), "utf8").match(/inputMode="(?:numeric|decimal)"|type="number"/g) ?? []).length;
            if (n) hallados[ruta.split("\\").join("/")] = n;
        }
        expect(hallados).toEqual(EXCEPCIONES);
    });
});
