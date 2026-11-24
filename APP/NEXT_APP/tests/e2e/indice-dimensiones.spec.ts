import { expect, test } from "@playwright/test";
import { leerRobots, revisarHtmlExtra, clasificarRastreadores, dominioPropio, calcularDimensiones, notaGeneral, aciertaIa, type MedicionSitio } from "../../src/lib/indice/dimensiones";

/**
 * Índice de la Web Chilena, edición 2026-12: las funciones puras de las dimensiones nuevas (buscadores, IA, correo,
 * privacidad). Diseño: docs/superpowers/specs/2026-11-23-indice-ampliado-design.md
 */
test.describe("índice: robots.txt (RFC 9309)", () => {
    test("sin robots.txt (404) se puede rastrear todo; con error de servidor, nada", () => {
        expect(leerRobots(null, 404).permite("Googlebot")).toBe(true);
        expect(leerRobots(null, 404).responde).toBe(true);
        expect(leerRobots(null, 503).permite("Googlebot")).toBe(false);
        expect(leerRobots(null, null).responde).toBe(false);
    });

    test("Disallow: / para todos bloquea; un grupo propio de un robot manda sobre el de todos", () => {
        const r = leerRobots("User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n", 200);
        expect(r.bloqueaTodo).toBe(true);
        expect(r.permite("Googlebot")).toBe(false);
        expect(r.permite("OAI-SearchBot")).toBe(true);
    });

    test("Disallow vacío o de una carpeta no bloquea la portada; la regla más larga gana y Allow gana en empate", () => {
        expect(leerRobots("User-agent: *\nDisallow:\n", 200).permite("GPTBot")).toBe(true);
        expect(leerRobots("User-agent: *\nDisallow: /admin/\n", 200).permite("GPTBot")).toBe(true);
        expect(leerRobots("User-agent: GPTBot\nDisallow: /\n", 200).permite("GPTBot")).toBe(false);
        expect(leerRobots("User-agent: *\nDisallow: /\nAllow: /$\n", 200).permite("ClaudeBot")).toBe(true);
        expect(leerRobots("user-agent: claudebot\ndisallow: /\n", 200).permite("ClaudeBot")).toBe(false);
    });

    test("varios robots en un mismo grupo, comentarios y mapas del sitio declarados", () => {
        const r = leerRobots("# hola\nUser-agent: GPTBot\nUser-agent: ClaudeBot # IA\nDisallow: /\n\nSitemap: https://ej.cl/sitemap.xml\n", 200);
        expect(r.permite("GPTBot")).toBe(false);
        expect(r.permite("ClaudeBot")).toBe(false);
        expect(r.permite("PerplexityBot")).toBe(true);
        expect(r.sitemaps).toEqual(["https://ej.cl/sitemap.xml"]);
    });

    test("un robots.txt que es una página HTML (el servidor responde la portada) se lee como sin reglas", () => {
        expect(leerRobots("<!doctype html><html><body>Inicio</body></html>", 200).permite("GPTBot")).toBe(true);
    });
});

test.describe("índice: lo que entrega el servidor", () => {
    const pagina = (cuerpo: string, cabeza = "") => `<!doctype html><html lang="es"><head><title>Municipalidad de Ejemplo</title>${cabeza}</head><body>${cuerpo}</body></html>`;

    test("canónica, h1, vista previa al compartir y largo del título", () => {
        const r = revisarHtmlExtra(pagina("<h1>Inicio</h1><p>texto</p>", '<link rel="canonical" href="https://ej.cl/"><meta property="og:title" content="Ej"><meta property="og:image" content="https://ej.cl/a.png">'));
        expect(r).toMatchObject({ canonica: true, h1: 1, og: true, largoTitulo: 24 });
        const s = revisarHtmlExtra(pagina("<h1>a</h1><h1>b</h1>", '<meta property="og:title" content="Ej">'));
        expect(s).toMatchObject({ canonica: false, h1: 2, og: false });
    });

    test("cuenta las palabras visibles sin scripts ni estilos", () => {
        const r = revisarHtmlExtra(pagina(`<p>${"palabra ".repeat(200)}</p><script>${"x ".repeat(500)}</script><style>a{}</style>`));
        expect(r.palabras).toBeGreaterThanOrEqual(200);
        expect(r.palabras).toBeLessThan(220);
    });

    test("datos estructurados de la institución: tipo, nombre y url, también dentro de @graph", () => {
        const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
        expect(revisarHtmlExtra(pagina("", ld({ "@type": "GovernmentOrganization", name: "Muni", url: "https://ej.cl" }))).institucion).toBe(true);
        expect(revisarHtmlExtra(pagina("", ld({ "@graph": [{ "@type": "WebSite", name: "x" }, { "@type": ["Organization"], name: "Muni", url: "https://ej.cl" }] }))).institucion).toBe(true);
        expect(revisarHtmlExtra(pagina("", ld({ "@type": "WebSite", name: "Muni", url: "https://ej.cl" }))).institucion).toBe(false);
        expect(revisarHtmlExtra(pagina("", ld({ "@type": "Organization", name: "Muni" }))).institucion).toBe(false);
        expect(revisarHtmlExtra(pagina("", '<script type="application/ld+json">{roto</script>')).institucion).toBe(false);
    });

    test("software a la vista: el generador declarado", () => {
        expect(revisarHtmlExtra(pagina("", '<meta name="generator" content="WordPress 5.8.2">')).generador).toBe("WordPress 5.8.2");
        expect(revisarHtmlExtra(pagina("")).generador).toBeNull();
    });
});

test.describe("índice: rastreadores y dominio propio", () => {
    test("cuenta tipos de rastreadores de terceros, sin el propio sitio ni el gestor de etiquetas solo", () => {
        const entidades: Record<string, { name: string; category: string }> = {
            "www.google-analytics.com": { name: "Google Analytics", category: "analytics" },
            "connect.facebook.net": { name: "Facebook", category: "social" },
            "www.googletagmanager.com": { name: "Google Tag Manager", category: "tag-manager" },
            "static.hotjar.com": { name: "Hotjar", category: "analytics" },
            "ej.cl": { name: "Ej", category: "content" },
        };
        const r = clasificarRastreadores(
            ["https://ej.cl/a.js", "https://www.google-analytics.com/g/collect", "https://connect.facebook.net/fbevents.js", "https://www.googletagmanager.com/gtm.js", "https://static.hotjar.com/c.js"],
            "ej.cl",
            (u) => entidades[new URL(u).hostname] ?? null,
        );
        expect(r.tipos).toEqual({ publicidad: false, redes: true, analitica: true, marketing: false });
        expect(r.nombres.sort()).toEqual(["Facebook", "Google Analytics", "Hotjar"]);
    });

    test("dominio propio: gob.cl, gov.cl, mil.cl y co.cl son sufijos públicos", () => {
        expect(dominioPropio("www.sii.cl")).toBe("sii.cl");
        expect(dominioPropio("www.dt.gob.cl")).toBe("dt.gob.cl");
        expect(dominioPropio("barrancas.educacionpublica.cl")).toBe("educacionpublica.cl");
        expect(dominioPropio("seremi5.redsalud.gob.cl")).toBe("redsalud.gob.cl");
        expect(dominioPropio("www.fach.mil.cl")).toBe("fach.mil.cl");
        expect(dominioPropio("tierramarilla.com")).toBe("tierramarilla.com");
    });
});

test.describe("índice: las siete dimensiones", () => {
    const html = { canonica: true, h1: 1, og: true, largoTitulo: 30, titulo: "Municipalidad de Ejemplo", palabras: 400, institucion: true, tiposLd: ["GovernmentOrganization"], generador: null };
    const revision = { https: true, redireccion: true, hsts: true, csp: false, marcos: true, nosniff: true, referrer: false, lang: true, titulo: true, descripcion: false, viewport: true, alt: true };
    const base: MedicionSitio = {
        fecha: "2026-11-24T03:00:00.000Z", estadoHttp: 200, notas: { rendimiento: 60, accesibilidad: 80, practicas: 80, seo: 100 }, revision,
        extra: {
            html, robots: { estado: 200, texto: "User-agent: *\nDisallow: /admin/\nUser-agent: GPTBot\nDisallow: /\nSitemap: https://ej.cl/sitemap.xml" },
            sitemap: { url: "https://ej.cl/sitemap.xml", estado: 200, esXml: true }, llms: { estado: 404, esTexto: false },
            certificado: { vence: "2027-03-01T00:00:00.000Z", valido: true, error: null }, software: { poweredBy: null, server: "nginx" },
        },
        rastreadores: { tipos: { publicidad: false, redes: true, analitica: true, marketing: false }, nombres: ["Facebook", "Google Analytics"] },
    };

    test("cada dimensión es el porcentaje de sus controles aprobados; velocidad es la nota de Lighthouse", () => {
        const d = calcularDimensiones(base, { correo: { spf: true, dmarc: "quarantine", dnssec: false }, directorios: { portal: true, sinim: false } });
        expect(d.velocidad).toBe(80);
        expect(d.buscadores?.nota).toBe(91); // 10 de 11 (falta la descripción)
        expect(d.ia?.c).toEqual({ robotsBusqueda: true, texto: true, datos: true });
        expect(d.ia?.entrenamiento).toBe(false); // GPTBot bloqueado: se informa, no resta
        expect(d.seguridad?.nota).toBe(75); // 6 de 8 (sin CSP ni política de referencia)
        expect(d.correo?.nota).toBe(67);
        expect(d.privacidad?.nota).toBe(50);
        expect(d.directorios?.nota).toBe(50);
        expect(notaGeneral(d)).toBe(Math.round((80 + 91 + 100 + 75 + 67 + 50 + 50) / 7));
    });

    test("si el servidor no dejó leer la portada (403), buscadores, IA y seguridad quedan sin dato, no reprobadas", () => {
        const d = calcularDimensiones({ ...base, estadoHttp: 403, revision: null, extra: null }, { correo: null, directorios: {} });
        expect(d.buscadores).toBeNull();
        expect(d.ia).toBeNull();
        expect(d.seguridad).toBeNull();
        expect(d.velocidad).toBe(80);
        expect(notaGeneral(d)).toBe(Math.round((80 + 50) / 2));
    });

    test("correo no aplica (dominio compartido) y directorios sin fichas no entran al promedio", () => {
        const d = calcularDimensiones(base, { correo: null, directorios: {} });
        expect(d.correo).toBeNull();
        expect(d.directorios).toBeNull();
    });

    test("sin Lighthouse no hay nota general", () => {
        const d = calcularDimensiones({ ...base, notas: null }, { correo: { spf: true, dmarc: "reject", dnssec: true }, directorios: {} });
        expect(d.velocidad).toBeNull();
        expect(notaGeneral(d)).toBeNull();
        expect(d.correo?.nota).toBe(100);
    });

    test("el certificado debe durar más de 14 días desde la medición", () => {
        const vence = (iso: string) => calcularDimensiones({ ...base, extra: { ...base.extra!, certificado: { vence: iso, valido: true, error: null } } }, { correo: null, directorios: {} }).seguridad!.c.certificado;
        expect(vence("2026-12-01T00:00:00.000Z")).toBe(false);
        expect(vence("2026-12-20T00:00:00.000Z")).toBe(true);
    });

    test("la IA acierta solo con el host exacto del sitio, no con el dominio de otro organismo", () => {
        const hosts = ["barrancas.educacionpublica.cl"];
        expect(aciertaIa("https://barrancas.educacionpublica.cl/", hosts)).toBe(true);
        expect(aciertaIa("El sitio es www.barrancas.educacionpublica.cl.", hosts)).toBe(true);
        expect(aciertaIa("https://educacionpublica.cl", hosts)).toBe(false);
        expect(aciertaIa("https://slepbarrancas.gob.cl", hosts)).toBe(false);
        expect(aciertaIa(null, hosts)).toBe(false);
    });

    test("también acierta una dirección que hoy redirige al sitio (dirección antigua de una delegación)", () => {
        const hosts = ["dpraricayparinacota.dpr.gob.cl"];
        const redirige = { "dpraricayparinacota.gob.cl": "dpraricayparinacota.dpr.gob.cl", "otro.cl": "otro.cl" };
        expect(aciertaIa("https://dpraricayparinacota.gob.cl", hosts, redirige)).toBe(true);
        expect(aciertaIa("https://otro.cl", hosts, redirige)).toBe(false);
        expect(aciertaIa("https://noresponde.cl", hosts, redirige)).toBe(false);
    });
});
