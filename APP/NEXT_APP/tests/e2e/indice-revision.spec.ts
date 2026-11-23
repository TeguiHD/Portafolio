import { expect, test } from "@playwright/test";
import { CONTROLES, puntajeRevision, revisarCabeceras, revisarHtml } from "../../src/lib/indice/revision";
import { claveIp, ipPermitida } from "../../src/lib/indice/ip-permitida";

/**
 * La revisión propia del Índice de la Web Chilena (y del revisor público): cabeceras de seguridad y lo básico del HTML
 * que entrega el servidor, sin ejecutar JavaScript. Es la misma función para los dos, así la comparación es pareja.
 */
const cab = (o: Record<string, string>) => new Headers(o);

test("HTTPS, HSTS, CSP aplicada, marcos, nosniff y referrer: cada uno se reconoce", () => {
    const r = revisarCabeceras(cab({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
    }), "https://ejemplo.cl/");
    expect(r).toEqual({ https: true, hsts: true, csp: true, marcos: true, nosniff: true, referrer: true });
});

test("una CSP solo de reporte no cuenta, y HSTS sin max-age o con max-age=0 tampoco", () => {
    const r = revisarCabeceras(cab({ "content-security-policy-report-only": "default-src 'self'", "strict-transport-security": "max-age=0" }), "https://ejemplo.cl/");
    expect(r.csp).toBe(false);
    expect(r.hsts).toBe(false);
    expect(revisarCabeceras(cab({ "strict-transport-security": "includeSubDomains" }), "https://ejemplo.cl/").hsts).toBe(false);
});

test("los marcos se protegen con X-Frame-Options o con frame-ancestors; HSTS por HTTP no vale", () => {
    expect(revisarCabeceras(cab({ "x-frame-options": "SAMEORIGIN" }), "https://a.cl/").marcos).toBe(true);
    expect(revisarCabeceras(cab({ "x-frame-options": "ALLOWALL" }), "https://a.cl/").marcos).toBe(false);
    expect(revisarCabeceras(cab({ "content-security-policy": "frame-ancestors *" }), "https://a.cl/").marcos).toBe(false);
    const http = revisarCabeceras(cab({ "strict-transport-security": "max-age=600" }), "http://a.cl/");
    expect(http.https).toBe(false);
    expect(http.hsts).toBe(false);
});

test("el HTML: idioma, título, descripción, viewport y texto alternativo de las imágenes", () => {
    const bueno = `<!doctype html><html lang="es-CL"><head><title>Municipalidad de Arica</title>
      <meta name="description" content="Sitio oficial"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body><img src="a.png" alt="Escudo"><img src="b.png" alt=""><IMG SRC=c.png ALT='Mapa'></body></html>`;
    expect(revisarHtml(bueno)).toEqual({ lang: true, titulo: true, descripcion: true, viewport: true, alt: true });
    const malo = `<html><head><title>  </title><meta content="x" name="keywords"></head><body><img src="a.png"><img alt="ok" src="b"></body></html>`;
    expect(revisarHtml(malo)).toEqual({ lang: false, titulo: false, descripcion: false, viewport: false, alt: false });
});

test("una imagen dentro de un comentario o de un script no cuenta; una página sin imágenes aprueba el texto alternativo", () => {
    expect(revisarHtml(`<html lang="es"><body><!-- <img src="x"> --><script>const s = '<img src=y>';</script></body></html>`).alt).toBe(true);
    // El atributo meta con comillas simples y en otro orden también se lee.
    expect(revisarHtml(`<meta content='Hola' name='description'>`).descripcion).toBe(true);
    expect(revisarHtml(`<meta name="description" content="">`).descripcion).toBe(false);
});

test("un HTML hostil de 3 MB con etiquetas sin cerrar se revisa en milisegundos, no en minutos (ReDoS)", () => {
    for (const trozo of ["<html", "<img alt=" + " ".repeat(50), "<!--", "<script>", "<title>", "<meta name=description content="]) {
        const hostil = trozo.repeat(Math.ceil(3_000_000 / trozo.length));
        const t0 = performance.now();
        revisarHtml(hostil);
        expect(performance.now() - t0, trozo).toBeLessThan(1500);
    }
});

test("hay doce controles y el puntaje es cuántos aprueba", () => {
    expect(CONTROLES).toHaveLength(12);
    expect(new Set(CONTROLES.map((c) => c.id)).size).toBe(12);
    const todo = { https: true, redireccion: true, hsts: true, csp: true, marcos: true, nosniff: true, referrer: true, lang: true, titulo: true, descripcion: true, viewport: true, alt: true };
    expect(puntajeRevision(todo)).toBe(12);
    expect(puntajeRevision({ ...todo, csp: false, hsts: false })).toBe(10);
});

test("IP permitidas: solo públicas, sin 6to4, Teredo ni la IP pública propia (la del router de la casa)", () => {
    expect(ipPermitida("93.184.216.34", 4, null)).toBe(true);
    expect(ipPermitida("2606:2800:220:1::1", 6, null)).toBe(true);
    for (const [ip, f] of [["127.0.0.1", 4], ["10.1.2.3", 4], ["192.168.1.1", 4], ["100.64.0.1", 4], ["169.254.169.254", 4], ["0.0.0.0", 4],
        ["::1", 6], ["fd00::1", 6], ["::ffff:127.0.0.1", 6], ["2002:7f00:1::1", 6], ["2001:0:4136:e378::1", 6], ["64:ff9b::7f00:1", 6]] as const) {
        expect(ipPermitida(ip, f, null), ip).toBe(false);
    }
    expect(ipPermitida("200.1.2.3", 4, "200.1.2.3")).toBe(false);
    expect(ipPermitida("200.1.2.4", 4, "200.1.2.3")).toBe(true);
});

test("el límite por IP agrupa una IPv6 por su /64 (un VPS trae millones de direcciones)", () => {
    expect(claveIp("2001:db8:1:2:aaaa::1")).toBe(claveIp("2001:db8:1:2:ffff:ffff:ffff:ffff"));
    expect(claveIp("2001:db8:1:2::1")).not.toBe(claveIp("2001:db8:1:3::1"));
    expect(claveIp("200.1.2.3")).toBe("200.1.2.3");
});
