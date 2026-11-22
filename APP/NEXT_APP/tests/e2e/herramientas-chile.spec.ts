import { chromium, expect, test } from "@playwright/test";
import { calcularDv, formatearRut, generarRut, validarRut } from "../../src/lib/chile/rut";
import { brutoDesdeLiquido, liquidoDesdeBruto } from "../../src/lib/chile/honorarios";
import { calcularSueldo, brutoParaLiquido, type ParametrosSueldo } from "../../src/lib/chile/sueldo";
import { PARAMETROS_SUELDO, RETENCION_HONORARIOS } from "../../src/lib/chile/parametros";

/**
 * Herramientas chilenas (jugada 2 del informe GEO, 22-11-2026): RUT, UF/UTM, sueldo líquido y boleta de honorarios,
 * y el botón «Insertar» para llevarlas a otros sitios con un enlace de vuelta.
 */
test.describe("sin navegador: RUT", () => {
    test("calcula el dígito verificador (módulo 11), con K y 0", () => {
        expect(calcularDv("12345678")).toBe("5");
        expect(calcularDv("7654321")).toBe("6");
        expect(calcularDv("6")).toBe("K");
        // Un cuerpo cuyo resto da 11 lleva 0.
        const conCero = Array.from({ length: 200 }, (_, i) => String(1000000 + i)).find((c) => calcularDv(c) === "0");
        expect(conCero).toBeTruthy();
    });

    test("valida lo que la gente escribe: con o sin puntos, guion, espacios y k minúscula", () => {
        for (const bueno of ["12.345.678-5", "12345678-5", "123456785", " 12 345 678 - 5 ", "6-k", "6-K"]) expect(validarRut(bueno).valido, bueno).toBe(true);
        const malo = validarRut("12.345.678-9");
        expect(malo.valido).toBe(false);
        expect(malo.esperado).toBe("5");
        for (const raro of ["", "abc", "12.345.678-X", "1234567X5", "1-", "1234567890123-1"]) expect(validarRut(raro).valido, raro).toBe(false);
    });

    test("formatea con puntos y guion", () => {
        expect(formatearRut("123456785")).toBe("12.345.678-5");
        expect(formatearRut("6k")).toBe("6-K");
        expect(formatearRut("7654321-6")).toBe("7.654.321-6");
    });

    test("los RUT de prueba que genera son válidos y distintos", () => {
        const varios = new Set(Array.from({ length: 50 }, () => generarRut()));
        expect(varios.size).toBeGreaterThan(40);
        for (const r of varios) expect(validarRut(r).valido, r).toBe(true);
    });
});

test.describe("sin navegador: boleta de honorarios", () => {
    test("retención por año según la Ley 21.133: 14,5 % en 2025, 15,25 % en 2026, 16 % en 2027 y 17 % desde 2028", () => {
        expect(RETENCION_HONORARIOS).toMatchObject({ 2025: 0.145, 2026: 0.1525, 2027: 0.16, 2028: 0.17 });
    });

    test("del bruto al líquido: retención al peso", () => {
        expect(liquidoDesdeBruto(100000, 0.1525)).toEqual({ bruto: 100000, retencion: 15250, liquido: 84750 });
        expect(liquidoDesdeBruto(333333, 0.1525)).toEqual({ bruto: 333333, retencion: 50833, liquido: 282500 });
    });

    test("del líquido que quieres recibir al bruto que debes cobrar, cuadrando al peso", () => {
        for (const liquido of [1, 100000, 84750, 250000, 1234567]) {
            const r = brutoDesdeLiquido(liquido, 0.1525);
            expect(r.liquido, String(liquido)).toBe(liquido);
            expect(r.bruto - r.retencion).toBe(liquido);
        }
    });
});

test.describe("sin navegador: sueldo líquido", () => {
    // Parámetros de ejemplo, redondos, para revisar el cálculo a mano (los vigentes están en src/lib/chile/parametros.ts).
    const P: ParametrosSueldo = {
        uf: 40000, utm: 70000, topeImponibleUf: 90, topeCesantiaUf: 135, cotizacionAfp: 0.10,
        cesantiaTrabajador: { indefinido: 0.006, plazo: 0 },
        tramos: [
            { hastaUtm: 13.5, factor: 0, rebajaUtm: 0 }, { hastaUtm: 30, factor: 0.04, rebajaUtm: 0.54 }, { hastaUtm: 50, factor: 0.08, rebajaUtm: 1.74 },
            { hastaUtm: 70, factor: 0.135, rebajaUtm: 4.49 }, { hastaUtm: 90, factor: 0.23, rebajaUtm: 11.14 }, { hastaUtm: 120, factor: 0.304, rebajaUtm: 17.8 },
            { hastaUtm: 310, factor: 0.35, rebajaUtm: 23.32 }, { hastaUtm: Infinity, factor: 0.4, rebajaUtm: 38.82 },
        ],
    };

    test("un sueldo bajo no paga impuesto único: solo AFP, salud y cesantía", () => {
        const r = calcularSueldo({ bruto: 800000, comisionAfp: 0.0145, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 }, P);
        expect(r.afp).toBe(91600); // 800.000 × 11,45 %
        expect(r.salud).toBe(56000); // 7 %
        expect(r.cesantia).toBe(4800); // 0,6 %
        expect(r.impuesto).toBe(0); // base 647.600 < 13,5 UTM (945.000)
        expect(r.liquido).toBe(800000 - 91600 - 56000 - 4800);
    });

    test("el impuesto único se calcula por tramo sobre la base sin cotizaciones", () => {
        const r = calcularSueldo({ bruto: 2000000, comisionAfp: 0.0145, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 }, P);
        const base = 2000000 - 229000 - 140000 - 12000; // 1.619.000 = 23,13 UTM → tramo del 4 %
        expect(r.baseTributable).toBe(base);
        expect(r.impuesto).toBe(Math.round(base * 0.04 - 0.54 * 70000));
    });

    test("sobre el tope imponible, AFP y salud se calculan sobre el tope, pero el impuesto usa todo el sueldo", () => {
        const r = calcularSueldo({ bruto: 5000000, comisionAfp: 0.01, salud: { tipo: "fonasa" }, contrato: "plazo", noImponible: 0 }, P);
        const tope = 90 * 40000; // 3.600.000
        expect(r.imponible).toBe(tope);
        expect(r.afp).toBe(Math.round(tope * 0.11));
        expect(r.salud).toBe(Math.round(tope * 0.07));
        expect(r.cesantia).toBe(0); // plazo fijo: lo paga el empleador
        expect(r.baseTributable).toBe(5000000 - r.afp - r.salud);
    });

    test("Isapre: se descuenta el plan si supera el 7 %, y el impuesto rebaja lo pagado hasta 6,3 UF (LIR art. 42 N° 1)", () => {
        const r = calcularSueldo({ bruto: 1500000, comisionAfp: 0.01, salud: { tipo: "isapre", planUf: 4 }, contrato: "indefinido", noImponible: 0 }, P);
        expect(r.salud).toBe(160000); // 4 UF > 7 % (105.000)
        expect(r.baseTributable).toBe(1500000 - r.afp - 160000 - r.cesantia);
        const caro = calcularSueldo({ bruto: 5000000, comisionAfp: 0.01, salud: { tipo: "isapre", planUf: 8 }, contrato: "indefinido", noImponible: 0 }, P);
        expect(caro.salud).toBe(320000);
        expect(caro.baseTributable).toBe(5000000 - caro.afp - Math.round(0.07 * 90 * 40000) - caro.cesantia); // tope 6,3 UF = 252.000
    });

    test("los topes se pasan a pesos con la UF del último día del mes, si se conoce", () => {
        const r = calcularSueldo({ bruto: 5000000, comisionAfp: 0.01, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 }, { ...P, ufTopes: 41000 });
        expect(r.imponible).toBe(90 * 41000);
    });

    test("caso verificado con los parámetros vigentes: $1.500.000 brutos, Habitat, Fonasa, indefinido → $1.207.390", () => {
        const r = calcularSueldo({ bruto: 1500000, comisionAfp: 0.0127, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 },
            { ...PARAMETROS_SUELDO, uf: 41384.81, utm: 72440 });
        expect([r.afp, r.salud, r.cesantia, r.impuesto, r.liquido]).toEqual([169050, 105000, 9000, 9560, 1207390]);
    });

    test("colación y movilización se suman al líquido y no pagan nada", () => {
        const sin = calcularSueldo({ bruto: 1200000, comisionAfp: 0.01, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 }, P);
        const con = calcularSueldo({ bruto: 1200000, comisionAfp: 0.01, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 80000 }, P);
        expect(con.liquido - sin.liquido).toBe(80000);
    });

    test("del líquido que quieres al bruto: ida y vuelta al peso", () => {
        for (const meta of [600000, 1000000, 2500000, 6000000]) {
            const datos = { comisionAfp: 0.0145, salud: { tipo: "fonasa" as const }, contrato: "indefinido" as const, noImponible: 0 };
            const bruto = brutoParaLiquido(meta, datos, P);
            const r = calcularSueldo({ ...datos, bruto }, P);
            expect(Math.abs(r.liquido - meta), String(meta)).toBeLessThanOrEqual(1);
        }
    });
});

test.describe("en la página", () => {
    test("RUT: dice qué dígito corresponde, revisa una lista y genera RUT de prueba válidos", async ({ page }) => {
        await page.goto("/herramientas/rut");
        const campo = page.getByLabel(/^RUT/);
        await campo.fill("12.345.678-9");
        await expect(page.locator("#rut-estado")).toHaveText("El dígito verificador de 12.345.678 es 5, no 9.");
        await campo.fill("123456785");
        await expect(page.locator("#rut-estado")).toHaveText("RUT válido: 12.345.678-5");
        await page.getByRole("button", { name: "Revisar una lista" }).click();
        await page.getByLabel(/Un RUT por línea/).fill("12.345.678-5\n11.111.111-2\nhola");
        await expect(page.getByText("1 de 3 son válidos.")).toBeVisible();
        await page.getByRole("button", { name: "Generar 5" }).click();
        const generados = await page.getByRole("list", { name: "RUT de prueba" }).locator("li span:first-child").allInnerTexts();
        expect(generados).toHaveLength(5);
        for (const r of generados) expect(validarRut(r).valido, r).toBe(true);
    });

    test("UF/UTM: los valores del día vienen en el HTML del servidor (sin JavaScript)", async ({ browser }) => {
        const ctx = await browser.newContext({ javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto("/herramientas/uf-utm");
        const texto = await page.locator("main").innerText();
        // Con la fuente arriba van la UF y la UTM con su fecha; si no respondió, se dice (nunca un valor inventado).
        expect(texto).toMatch(/UF del \d{2}-\d{2}-\d{4}[\s\S]*\$\d{2}\.\d{3},\d{2}[\s\S]*UTM de \w+ de \d{4}|no respondió/);
        await ctx.close();
    });

    test("UF/UTM: convierte UF a pesos con el valor del día", async ({ page }) => {
        await page.goto("/herramientas/uf-utm");
        const uf = page.locator(".cl-indicadores > div").first().locator("dd");
        test.skip(!(await uf.count()), "la fuente de indicadores no respondió");
        const valorUf = Number((await uf.innerText()).replace(/[$.]/g, "").replace(",", "."));
        await page.getByLabel("Monto", { exact: true }).fill("2");
        const pesos = Number((await page.locator(".cl-fila.cl-total dd").innerText()).replace(/[^\d]/g, ""));
        expect(pesos).toBe(Math.round(2 * valorUf));
    });

    test("sueldo líquido: el caso verificado da lo mismo en la página, con la UTM del mes que muestra", async ({ page }) => {
        await page.goto("/herramientas/sueldo-liquido");
        await page.getByLabel(/Sueldo bruto mensual/).fill("1.500.000");
        await page.getByLabel("AFP", { exact: true }).selectOption({ label: "Habitat · comisión 1,27 %" });
        const nota = await page.locator(".cl-panel .cl-nota").first().innerText();
        const utm = Number(nota.match(/UTM de [a-z]+ de \d{4} \(\$([\d.]+)\)/)![1]!.replace(/\./g, ""));
        const esperado = calcularSueldo({ bruto: 1500000, comisionAfp: 0.0127, salud: { tipo: "fonasa" }, contrato: "indefinido", noImponible: 0 }, { ...PARAMETROS_SUELDO, uf: 41384.81, utm });
        await expect(page.locator(".cl-fila.cl-total dd")).toContainText(`$${esperado.liquido.toLocaleString("es-CL")}`);
        // Al revés: pidiendo ese líquido, vuelve el mismo bruto.
        await page.getByRole("button", { name: "Quiero un líquido de" }).click();
        await page.getByLabel(/Sueldo líquido que quieres/).fill(esperado.liquido.toLocaleString("es-CL"));
        await expect(page.locator(".cl-fila.cl-total dd")).toContainText("$1.500.000");
    });

    test("honorarios: para recibir $500.000 en 2026 la boleta es de $589.971", async ({ page }) => {
        await page.goto("/herramientas/boleta-honorarios");
        await page.getByRole("button", { name: "Quiero recibir" }).click();
        await page.getByLabel(/Monto líquido/).fill("500.000");
        await page.getByLabel("Año de la boleta").selectOption("2026");
        await expect(page.locator(".cl-fila.cl-total dd")).toContainText("$589.971");
        await expect(page.locator(".cl-filas")).toContainText("Retención (15,25 %)");
    });

    test("catálogo: la familia Chile reúne las cinco calculadoras chilenas", async ({ page }) => {
        await page.goto("/herramientas");
        await expect(page.getByRole("group", { name: "Filtrar por categoría" }).getByRole("button", { name: /^Chile\s*5$/ })).toBeVisible();
    });

    test("«Insertar en tu sitio» da el iframe y un enlace visible de vuelta", async ({ page }) => {
        await page.goto("/herramientas/rut");
        await page.getByText("Insertar en tu sitio").click();
        const codigo = await page.getByLabel("Código para insertar").inputValue();
        expect(codigo).toContain('src="https://nicoholas.dev/insertar/rut"');
        expect(codigo).toContain('<a href="https://nicoholas.dev/herramientas/rut">Validador de RUT</a>');
    });
});

test.describe("insertar en otro sitio", () => {
    test("la herramienta se puede incrustar desde otro origen y lleva el enlace de vuelta", async ({ baseURL }) => {
        // La página que la inserta (un blog) se sirve desde otro origen. Chrome no deja que una página «pública» incruste la
        // red local (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS), lo que aquí impediría probar contra el servidor local: este
        // navegador se abre sin esa revisión. En producción las dos páginas son públicas y no aplica.
        const navegador = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks"] });
        const page = await navegador.newPage();
        await page.route("http://blog-de-otro.example/", (r) => r.fulfill({ contentType: "text/html", body: `<iframe src="${baseURL}/insertar/rut" width="600" height="700"></iframe>` }));
        await page.goto("http://blog-de-otro.example/");
        const marco = page.frameLocator("iframe");
        await expect(marco.getByRole("heading", { name: "Validador de RUT" })).toBeVisible();
        await expect(marco.getByRole("link", { name: /nicoholas\.dev/ })).toHaveAttribute("href", "https://nicoholas.dev/herramientas/rut");
        await navegador.close();
    });

    test("la versión para insertar no se indexa y apunta a la herramienta", async ({ request }) => {
        const r = await request.get("/insertar/uf-utm");
        expect(r.headers()["content-security-policy"]).toContain("frame-ancestors *");
        const html = await r.text();
        expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
        expect(html).toMatch(/<link rel="canonical" href="https:\/\/nicoholas\.dev\/herramientas\/uf-utm"/);
    });

    test("solo las calculadoras chilenas se pueden insertar; el resto del sitio sigue sin poder incrustarse", async ({ request }) => {
        expect((await request.get("/insertar/qr")).status()).toBe(404);
        const herramienta = await request.get("/herramientas/rut");
        expect(herramienta.headers()["content-security-policy"]).toMatch(/frame-ancestors '(none|self)'/); // 'self' solo en local
    });
});
