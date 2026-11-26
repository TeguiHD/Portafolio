import { expect, test } from "@playwright/test";
import { enmarcableEnEscritorio } from "../../src/lib/escritorio/enmarcable";
import { areaUtil, contener, rectZona, zonaEncaje, posicionInicial } from "../../src/modules/escritorio/geometria";
import { idDeRuta } from "../../src/modules/escritorio/apps";
import { centroide, duracionSobre, energiaEntre, sintetizarAviso, sintetizarClic, sintetizarTecla } from "../../src/modules/escritorio/sintesis";
import { interpretarPreferencias } from "../../src/modules/escritorio/sonido";

/**
 * Modo escritorio (/escritorio): la lógica que no necesita navegador. Qué páginas se pueden abrir en una ventana,
 * cómo se encajan las ventanas en los bordes y a qué ventana lleva cada enlace del sitio.
 */
test.describe("escritorio: lógica", () => {
    test("solo las páginas públicas se pueden enmarcar", () => {
        for (const ruta of ["/", "/herramientas/qr", "/sobre-mi", "/blog", "/contacto", "/indice-web-chilena/metodologia", "/servicios/tiendas-en-linea"]) {
            expect(enmarcableEnEscritorio(ruta), ruta).toBe(true);
        }
        for (const ruta of ["/admin", "/admin/finanzas", "/api/contact", "/acceso", "/cambiar-clave", "/cotizacion", "/cotizacion/abc"]) {
            expect(enmarcableEnEscritorio(ruta), ruta).toBe(false);
        }
    });

    test("el área útil deja libre la cápsula de tareas", () => {
        const a = areaUtil(1440, 900);
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.y + a.h).toBeLessThanOrEqual(900 - 70);
        expect(a.w).toBeGreaterThan(1380);
    });

    test("arrastrar al borde encaja a la mitad o maximiza", () => {
        expect(zonaEncaje(1, 400, 1440)).toBe("izq");
        expect(zonaEncaje(1439, 400, 1440)).toBe("der");
        expect(zonaEncaje(700, 0, 1440)).toBe("max");
        expect(zonaEncaje(700, 400, 1440)).toBeNull();
        const a = areaUtil(1440, 900), izq = rectZona("izq", a), der = rectZona("der", a);
        expect(izq.x).toBe(a.x);
        expect(der.x + der.w).toBe(a.x + a.w);
        expect(izq.w).toBe(der.w);
        expect(der.x).toBeGreaterThan(izq.x + izq.w);
        expect(rectZona("max", a)).toEqual(a);
    });

    test("una ventana nunca queda fuera de alcance", () => {
        const a = areaUtil(1280, 800);
        const lejos = contener({ x: 5000, y: -300, w: 3000, h: 3000 }, a);
        expect(lejos.w).toBeLessThanOrEqual(a.w);
        expect(lejos.h).toBeLessThanOrEqual(a.h);
        expect(lejos.y).toBeGreaterThanOrEqual(a.y);
        expect(lejos.x).toBeLessThanOrEqual(a.x + a.w - 120);
        const chica = contener({ x: 100, y: 100, w: 50, h: 50 }, a);
        expect(chica.w).toBeGreaterThanOrEqual(360);
        expect(chica.h).toBeGreaterThanOrEqual(240);
    });

    test("las ventanas nuevas se escalonan dentro del área", () => {
        const a = areaUtil(1440, 900), p0 = posicionInicial(0, 900, 600, a), p1 = posicionInicial(1, 900, 600, a);
        expect(p1.x).not.toBe(p0.x);
        expect(p1.y).not.toBe(p0.y);
        for (const p of [p0, p1, posicionInicial(5, 2000, 2000, a)]) {
            expect(p.x).toBeGreaterThanOrEqual(a.x);
            expect(p.y).toBeGreaterThanOrEqual(a.y);
            expect(p.x + p.w).toBeLessThanOrEqual(a.x + a.w);
            expect(p.y + p.h).toBeLessThanOrEqual(a.y + a.h);
        }
    });

    test("cada enlace del sitio lleva a su ventana", () => {
        expect(idDeRuta("/herramientas/qr", "")).toBe("herramientas/qr");
        expect(idDeRuta("/herramientas", "")).toBe("herramientas");
        expect(idDeRuta("/sobre-mi", "")).toBe("sobre-mi");
        expect(idDeRuta("/indice-web-chilena/metodologia", "")).toBe("indice");
        expect(idDeRuta("/", "#proyectos")).toBe("proyectos");
        expect(idDeRuta("/", "#contacto")).toBe("conversemos");
        expect(idDeRuta("/contacto", "")).toBe("conversemos");
        expect(idDeRuta("/admin", "")).toBeNull();
        expect(idDeRuta("/cotizacion", "")).toBeNull();
    });
});

const SR = 44100;
const pico = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

/**
 * El sonido se fabrica con síntesis, sin archivos. El clic de mouse tiene el carácter del que le gustó al dueño (bait.cl,
 * medido el 26-11): golpe seco de pocos milisegundos con la energía entre 4 y 11 kHz; soltar, más agudo y más suave.
 */
test.describe("escritorio: sonido", () => {
    test("el clic de mouse es agudo y corto, como un microinterruptor", () => {
        for (const s of [1, 2, 3, 4]) {
            const x = sintetizarClic("mouse", "presionar", s, SR);
            const c = centroide(x, SR);
            expect(c, `semilla ${s}`).toBeGreaterThan(6000);
            expect(c, `semilla ${s}`).toBeLessThan(10000);
            expect(duracionSobre(x, SR, -30), `semilla ${s}`).toBeLessThan(0.035);
            expect(pico(x)).toBeLessThanOrEqual(1);
            expect(pico(x)).toBeGreaterThan(0.5);
        }
    });

    // Como en el de bait.cl, soltar casi no tiene cuerpo entre 3 y 6 kHz (allí presionar suena «clic» y soltar «tic»).
    test("soltar es más fino y más suave que presionar", () => {
        const cuerpo = (x: Float32Array) => energiaEntre(x, SR, 3000, 6400) / energiaEntre(x, SR, 6400, 16000);
        for (const s of [1, 2, 3, 4, 5, 6]) {
            const p = sintetizarClic("mouse", "presionar", s, SR), q = sintetizarClic("mouse", "soltar", s, SR);
            expect(cuerpo(q), `semilla ${s}`).toBeLessThan(cuerpo(p) * 0.5);
            expect(pico(q)).toBeLessThan(pico(p));
        }
    });

    test("el silencioso es grave y el retro queda entre medio", () => {
        expect(centroide(sintetizarClic("silencioso", "presionar", 1, SR), SR)).toBeLessThan(4000);
        const r = centroide(sintetizarClic("retro", "presionar", 1, SR), SR);
        expect(r).toBeGreaterThan(2500);
        expect(r).toBeLessThan(6500);
    });

    test("misma semilla, mismo sonido; otra semilla, otro", () => {
        const a = sintetizarClic("mouse", "presionar", 7, SR), b = sintetizarClic("mouse", "presionar", 7, SR), c = sintetizarClic("mouse", "presionar", 8, SR);
        expect(Array.from(a)).toEqual(Array.from(b));
        expect(Array.from(a)).not.toEqual(Array.from(c));
    });

    test("la tecla suena a teclado mecánico y los avisos son cortos", () => {
        for (const s of [1, 2, 3]) {
            const c = centroide(sintetizarTecla(s, SR), SR);
            expect(c, `tecla ${s}`).toBeGreaterThan(2000);
            expect(c, `tecla ${s}`).toBeLessThan(6500);
        }
        for (const t of ["notificacion", "inicio"] as const) {
            const x = sintetizarAviso(t, SR);
            expect(x.length / SR).toBeLessThan(1.6);
            expect(pico(x)).toBeLessThanOrEqual(1);
            expect(pico(x)).toBeGreaterThan(0.1);
        }
    });

    test("las preferencias de la versión anterior caen a lo de fábrica", () => {
        const v1 = JSON.stringify({ activo: false, volumen: 0.3, tipo: "suave", clic: true, teclas: false, ventanas: true });
        const p = interpretarPreferencias(v1, false);
        expect(p.tipo).toBe("mouse");
        expect(p.activo).toBe(false);
        expect(p.volumen).toBe(0.3);
        expect(p.teclas).toBe(false);
        expect(p.avisos).toBe(true);
        expect(interpretarPreferencias(JSON.stringify({ tipo: "toString" }), false).tipo).toBe("mouse");
        expect(interpretarPreferencias("{roto", true).activo).toBe(false);
        expect(interpretarPreferencias(null, false).activo).toBe(true);
    });
});
