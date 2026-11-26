import { expect, test } from "@playwright/test";
import { enmarcableEnEscritorio } from "../../src/lib/escritorio/enmarcable";
import { areaUtil, contener, rectZona, zonaEncaje, posicionInicial } from "../../src/modules/escritorio/geometria";
import { idDeRuta } from "../../src/modules/escritorio/apps";

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
