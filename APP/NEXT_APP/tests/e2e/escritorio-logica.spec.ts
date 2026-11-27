import { expect, test } from "@playwright/test";
import { enmarcableEnEscritorio } from "../../src/lib/escritorio/enmarcable";
import { areaUtil, contener, rectZona, zonaEncaje, posicionInicial } from "../../src/modules/escritorio/geometria";
import { idDeRuta } from "../../src/modules/escritorio/apps";
import { arbol, buscarNodo, padre } from "../../src/modules/escritorio/aplicaciones/vfs";
import { interpretarPrefs, PREFS_BASE } from "../../src/modules/escritorio/preferencias";
import { centroide, duracionSobre, energiaEntre, sintetizarAviso, sintetizarClic, sintetizarTecla } from "../../src/modules/escritorio/sintesis";
import { interpretarPreferencias } from "../../src/modules/escritorio/sonido";
import { FONDOS, fondoPorDefecto, miniFondo, srcsetFondo } from "../../src/modules/escritorio/fondos";
import { existsSync, statSync } from "node:fs";

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

    test("el área útil deja libre la barra de tareas de abajo", () => {
        const a = areaUtil(1440, 900);
        expect(a).toEqual({ x: 0, y: 0, w: 1440, h: 900 - 48 });
        expect(areaUtil(390, 844, true).h).toBeLessThan(844);
    });

    test("arrastrar al borde encaja a la mitad, a una esquina un cuarto y arriba maximiza", () => {
        expect(zonaEncaje(1, 400, 1440, 900)).toBe("izq");
        expect(zonaEncaje(1439, 400, 1440, 900)).toBe("der");
        expect(zonaEncaje(700, 0, 1440, 900)).toBe("max");
        expect(zonaEncaje(1, 10, 1440, 900)).toBe("si");
        expect(zonaEncaje(1439, 10, 1440, 900)).toBe("sd");
        expect(zonaEncaje(1, 840, 1440, 900)).toBe("ii");
        expect(zonaEncaje(1439, 840, 1440, 900)).toBe("id");
        expect(zonaEncaje(10, 0, 1440, 900)).toBe("si");
        expect(zonaEncaje(700, 400, 1440, 900)).toBeNull();
    });

    test("las zonas de acople llenan el área sin huecos ni encimarse", () => {
        const a = areaUtil(1440, 900);
        const izq = rectZona("izq", a), der = rectZona("der", a);
        expect(izq.x).toBe(0); expect(izq.w + der.w).toBe(1440); expect(der.x).toBe(izq.w);
        const [si, sd, ii, id] = (["si", "sd", "ii", "id"] as const).map((z) => rectZona(z, a));
        expect(si.w + sd.w).toBe(1440); expect(si.h + ii.h).toBe(a.h); expect(id.x).toBe(si.w); expect(id.y).toBe(si.h);
        const [t1, t2, t3] = (["t1", "t2", "t3"] as const).map((z) => rectZona(z, a));
        expect(t1.w + t2.w + t3.w).toBe(1440); expect(t2.x).toBe(t1.w); expect(t3.x).toBe(t1.w + t2.w);
        const t12 = rectZona("t12", a);
        expect(t12.x).toBe(0); expect(t12.w).toBe(t1.w + t2.w);
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
        expect(idDeRuta("/servicios", "")).toBe("servicios");
        expect(idDeRuta("/servicios/tienda-online", "")).toBe("servicios/tienda-online");
        expect(idDeRuta("/", "#proyectos")).toBe("proyectos");
        expect(idDeRuta("/", "#contacto")).toBe("correo");
        expect(idDeRuta("/contacto", "")).toBe("correo");
        expect(idDeRuta("/admin", "")).toBeNull();
        expect(idDeRuta("/cotizacion", "")).toBeNull();
    });

    test("el Explorador: proyectos con sus capturas y su sitio, herramientas por familia y documentos", () => {
        const raiz = arbol({
            herramientas: [{ slug: "qr", nombre: "Generador de QR", familia: "generación" }, { slug: "comprimir-imagen", nombre: "Comprimir imagen", familia: "imágenes" }, { slug: "redimensionar", nombre: "Redimensionar", familia: "imágenes" }],
            proyectos: [{ id: "floresdyd", titulo: "FloresDyD", tipo: "Tienda en línea", texto: "Una tienda", imagen: "/a.webp", imagenAlt: "Portada", cta: "Visitar tienda", href: "https://floresdyd.cl", externo: true, direccion: "floresdyd.cl", vistas: [{ nombre: "Portada", escritorio: "/p.jpg", celular: "/pc.jpg" }, { nombre: "Catálogo", escritorio: "/c.jpg", celular: "/cc.jpg" }] }],
            servicios: [{ slug: "tienda-online", nombre: "Tiendas en línea a medida", resumen: "Para vender" }],
        });
        expect(raiz.hijos?.map((h) => h.nombre)).toEqual(["Proyectos", "Servicios", "Herramientas", "Documentos"]);
        const flores = buscarNodo(raiz, "proyectos/floresdyd");
        expect(flores?.tipo).toBe("carpeta");
        const imagenes = flores?.hijos?.filter((h) => h.tipo === "imagen") ?? [];
        expect(imagenes.length).toBe(4);
        expect(imagenes[0].abrir).toEqual({ app: "fotos", args: { proyecto: "floresdyd", indice: 0 } });
        expect(flores?.hijos?.find((h) => h.tipo === "enlace")?.abrir).toEqual({ externo: "https://floresdyd.cl" });
        const imgs = buscarNodo(raiz, "herramientas/imagenes");
        expect(imgs?.hijos?.map((h) => h.nombre)).toEqual(["Comprimir imagen", "Redimensionar"]);
        expect(imgs?.hijos?.[0].abrir).toEqual({ app: "herramientas/comprimir-imagen" });
        expect(buscarNodo(raiz, "servicios")?.hijos?.[0].abrir).toEqual({ app: "servicios/tienda-online" });
        expect(buscarNodo(raiz, "documentos")?.hijos?.map((h) => h.abrir && "app" in h.abrir ? h.abrir.app : "")).toContain("sobre-mi");
        expect(buscarNodo(raiz, "no/existe")).toBeNull();
        expect(padre("proyectos/floresdyd")).toBe("proyectos");
        expect(padre("proyectos")).toBe("");
        expect(padre("")).toBeNull();
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

/** Los fondos son imágenes propias generadas por scripts/escritorio/fondos (no se descargan de ningún lado). */
test.describe("escritorio: fondos", () => {
    test("cada fondo de imagen tiene sus tres tamaños en AVIF y WebP, y su miniatura", () => {
        const deImagen = FONDOS.filter((f) => f.tipo === "imagen");
        expect(deImagen.length).toBe(8);
        for (const f of deImagen) {
            for (const formato of ["avif", "webp"] as const) {
                const archivos = srcsetFondo(f.id, formato).split(", ").map((x) => x.split(" ")[0].split("?")[0]);
                expect(archivos, f.id).toHaveLength(3);
                for (const a of archivos) {
                    const ruta = `public${a}`;
                    expect(existsSync(ruta), ruta).toBe(true);
                    expect(statSync(ruta).size, ruta).toBeLessThan(900_000);
                }
            }
            expect(existsSync(`public${miniFondo(f.id).split("?")[0]}`), f.id).toBe(true);
        }
    });

    test("preferencias rotas o de la versión anterior caen a lo de fábrica", () => {
        expect(interpretarPrefs(null)).toEqual(PREFS_BASE);
        expect(interpretarPrefs("{roto")).toEqual(PREFS_BASE);
        const p = interpretarPrefs(JSON.stringify({ fondo: "olas", solido: "red", alinear: "arriba", iconos: "enormes", animaciones: "si", anclados: ["correo", 3, null, "explorador"] }));
        expect(p.fondo).toBeNull();
        expect(p.solido).toBe(PREFS_BASE.solido);
        expect(p.alinear).toBe("centro");
        expect(p.iconos).toBe("medianos");
        expect(p.animaciones).toBe(true);
        expect(p.anclados).toEqual(["correo", "explorador"]);
        expect(interpretarPrefs(JSON.stringify({ fondo: "pacifico", alinear: "izq", iconos: "grandes", noMolestar: true })))
            .toMatchObject({ fondo: "pacifico", alinear: "izq", iconos: "grandes", noMolestar: true });
    });

    test("sin elección, el fondo sigue al tema", () => {
        expect(fondoPorDefecto("oscuro")).toBe("pampa");
        expect(fondoPorDefecto("claro")).toBe("cordillera");
        expect(FONDOS.find((f) => f.id === "pampa")?.tema).toBe("oscuro");
        expect(FONDOS.find((f) => f.id === "cordillera")?.tema).toBe("claro");
        expect(FONDOS.some((f) => f.tipo === "vivo")).toBe(true);
        expect(FONDOS.some((f) => f.tipo === "solido")).toBe(true);
    });
});
